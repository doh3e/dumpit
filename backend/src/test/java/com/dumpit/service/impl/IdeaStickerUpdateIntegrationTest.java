package com.dumpit.service.impl;

import com.dumpit.entity.Idea;
import com.dumpit.entity.User;
import com.dumpit.entity.UserPurchase;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.PurchaseRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.IdeaService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Task 11 QA 픽스 근거: 스티커만 바꾸는 벌크 업데이트가 실제 Hibernate/Postgres 위에서도
 * ideas.updated_at을 건드리지 않는지, 그리고 벌크 업데이트 후 detach된 엔티티를 활동 로그에
 * 사용해도 예외 없이 동작하는지를 실제 로컬 DB로 검증한다.
 * 테스트 트랜잭션은 종료 시 자동 롤백되어 DB에 흔적을 남기지 않는다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class IdeaStickerUpdateIntegrationTest {

    @Autowired
    private IdeaService ideaService;
    @Autowired
    private IdeaRepository ideaRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PurchaseRepository purchaseRepository;
    @Autowired
    private EntityManager entityManager;

    @Test
    void 스티커_변경은_updatedAt을_바꾸지_않는다() {
        String uniqueSuffix = UUID.randomUUID().toString();
        User user = userRepository.save(User.of(
                "sticker-jump-test-" + uniqueSuffix + "@test.dumpit.local",
                "테스터", "google", "test-" + uniqueSuffix));
        purchaseRepository.save(UserPurchase.of(user, "sticker.heart", 80));

        Idea idea = ideaRepository.save(Idea.of(user, "스티커 점프 회귀 테스트", null));
        entityManager.flush();
        entityManager.clear();

        LocalDateTime originalUpdatedAt = ideaRepository.findActiveById(idea.getIdeaId())
                .orElseThrow()
                .getUpdatedAt();

        Idea result = ideaService.updateSticker(user.getEmail(), idea.getIdeaId(), "sticker.heart");
        assertThat(result.getStickerCode()).isEqualTo("sticker.heart");

        entityManager.flush();
        entityManager.clear();

        Idea afterUpdate = ideaRepository.findActiveById(idea.getIdeaId()).orElseThrow();
        assertThat(afterUpdate.getStickerCode()).isEqualTo("sticker.heart");
        assertThat(afterUpdate.getUpdatedAt()).isEqualTo(originalUpdatedAt);

        // 해제(code=null)도 동일하게 updatedAt을 보존하는지 함께 확인
        ideaService.updateSticker(user.getEmail(), idea.getIdeaId(), null);
        entityManager.flush();
        entityManager.clear();

        Idea afterRemoved = ideaRepository.findActiveById(idea.getIdeaId()).orElseThrow();
        assertThat(afterRemoved.getStickerCode()).isNull();
        assertThat(afterRemoved.getUpdatedAt()).isEqualTo(originalUpdatedAt);
    }
}
