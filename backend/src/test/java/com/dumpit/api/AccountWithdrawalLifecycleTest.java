package com.dumpit.api;

import com.dumpit.entity.BrainDump;
import com.dumpit.entity.Idea;
import com.dumpit.entity.Inquiry;
import com.dumpit.entity.Routine;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.InquiryRepository;
import com.dumpit.repository.RoutineRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.service.AccountPurgeScheduler;
import com.dumpit.service.GoogleUserUpserter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 탈퇴 → 유예 → (복구 | 완전 파기) 생애주기 */
class AccountWithdrawalLifecycleTest extends ApiIntegrationTestBase {

    @Autowired private TaskRepository taskRepository;
    @Autowired private IdeaRepository ideaRepository;
    @Autowired private RoutineRepository routineRepository;
    @Autowired private BrainDumpRepository brainDumpRepository;
    @Autowired private InquiryRepository inquiryRepository;
    @Autowired private GoogleUserUpserter googleUserUpserter;
    @Autowired private AccountPurgeScheduler accountPurgeScheduler;

    // ---------- 유예 기간 ----------

    @Test
    void 탈퇴해도_유예중에는_콘텐츠가_보존된다() throws Exception {
        taskRepository.save(Task.of(userA, "살아있어야 할 태스크", null, null, 30));
        brainDumpRepository.save(BrainDump.of(userA, "브레인덤프 원문"));

        withdraw();

        // 소프트 삭제라 조회에는 안 잡히지만 행과 원문은 그대로 남아 있어야 복구할 수 있다
        assertThat(taskRepository.count()).isEqualTo(1);
        BrainDump dump = brainDumpRepository.findAll().get(0);
        assertThat(dump.getRawText()).isEqualTo("브레인덤프 원문");
        assertThat(dump.getDeletedAt()).isNotNull();
    }

    // ---------- 복구 ----------

    @Test
    void 유예중_재로그인하면_계정과_콘텐츠가_복구된다() throws Exception {
        Task task = taskRepository.save(Task.of(userA, "복구될 태스크", null, null, 30));
        Idea idea = ideaRepository.save(Idea.of(userA, "복구될 아이디어", "내용"));
        Routine routine = routineRepository.save(Routine.of(userA, "복구될 루틴"));

        withdraw();
        GoogleUserUpserter.UpsertResult result = login();

        assertThat(result.restored()).isTrue();
        assertThat(result.user().getStatus()).isEqualTo(User.Status.ACTIVE);
        assertThat(result.user().getPurgeAfter()).isNull();
        assertThat(result.user().getWithdrawalMarkedAt()).isNull();
        assertThat(taskRepository.findById(task.getTaskId()).orElseThrow().getDeletedAt()).isNull();
        assertThat(ideaRepository.findById(idea.getIdeaId()).orElseThrow().getDeletedAt()).isNull();
        assertThat(routineRepository.findById(routine.getRoutineId()).orElseThrow().getDeletedAt()).isNull();
    }

    @Test
    void 복구해도_탈퇴전에_직접_지운_항목은_되살아나지_않는다() throws Exception {
        Task keep = taskRepository.save(Task.of(userA, "탈퇴가 지운 태스크", null, null, 30));
        Task selfDeleted = taskRepository.save(Task.of(userA, "내가 지운 태스크", null, null, 30));
        // 사용자가 탈퇴 전에 스스로 지운 태스크 — 탈퇴 마킹 시각과 삭제 시각이 다르다
        jdbcTemplate.update("UPDATE tasks SET deleted_at = ? WHERE task_id = ?",
                LocalDateTime.now().minusDays(3), selfDeleted.getTaskId());

        withdraw();
        login();

        assertThat(taskRepository.findById(keep.getTaskId()).orElseThrow().getDeletedAt()).isNull();
        assertThat(taskRepository.findById(selfDeleted.getTaskId()).orElseThrow().getDeletedAt()).isNotNull();
    }

    @Test
    void 유예가_지난_계정은_복구되지_않고_차단된다() throws Exception {
        withdraw();
        expireGrace();

        assertThatThrownByLogin();
    }

    // ---------- 완전 파기 ----------

    @Test
    void 유예가_끝나면_계정과_콘텐츠가_완전히_삭제된다() throws Exception {
        taskRepository.save(Task.of(userA, "지워질 태스크", null, null, 30));
        ideaRepository.save(Idea.of(userA, "지워질 아이디어", "내용"));
        routineRepository.save(Routine.of(userA, "지워질 루틴"));
        brainDumpRepository.save(BrainDump.of(userA, "지워질 원문"));

        withdraw();
        expireGrace();
        accountPurgeScheduler.purgeExpiredAccounts();

        assertThat(userRepository.findById(userA.getUserId())).isEmpty();
        assertThat(taskRepository.count()).isZero();
        assertThat(ideaRepository.count()).isZero();
        assertThat(routineRepository.count()).isZero();
        assertThat(brainDumpRepository.count()).isZero();
        assertThat(countRows("activity_logs")).isZero();
    }

    @Test
    void 완전삭제해도_문의는_남고_계정_연결만_끊긴다() throws Exception {
        inquiryRepository.save(Inquiry.of(userA, USER_A, "문의 제목", "문의 본문"));

        withdraw();
        expireGrace();
        accountPurgeScheduler.purgeExpiredAccounts();

        Inquiry inquiry = inquiryRepository.findAll().get(0);
        assertThat(inquiry.getUser()).isNull();
        assertThat(inquiry.getUserEmail()).doesNotContain("usera@test");
        assertThat(inquiry.getMessage()).isEqualTo("문의 본문");
    }

    @Test
    void 유예가_남은_계정은_purge_대상이_아니다() throws Exception {
        withdraw();

        accountPurgeScheduler.purgeExpiredAccounts();

        assertThat(userRepository.findById(userA.getUserId())).isPresent();
    }

    @Test
    void 활성_계정은_purge되지_않는다() {
        accountPurgeScheduler.purgeExpiredAccounts();

        assertThat(userRepository.findAll()).hasSize(3);
    }

    // ---------- 헬퍼 ----------

    private void withdraw() throws Exception {
        mockMvc.perform(delete("/me/account").with(asUser(USER_A)))
                .andExpect(status().isNoContent());
    }

    /** 유예가 이미 끝난 것으로 만든다 */
    private void expireGrace() {
        jdbcTemplate.update("UPDATE users SET purge_after = ? WHERE user_id = ?",
                LocalDateTime.now().minusDays(1), userA.getUserId());
    }

    /**
     * 같은 구글 계정으로 다시 로그인. 공용 픽스처는 provider를 소문자 'google'로 심는데
     * 실제 로그인 경로는 'GOOGLE'로 조회하므로, 조회가 맞도록 먼저 정렬한다.
     */
    private GoogleUserUpserter.UpsertResult login() {
        jdbcTemplate.update("UPDATE users SET provider = 'GOOGLE' WHERE user_id = ?", userA.getUserId());
        return googleUserUpserter.upsert("test-a", USER_A, "테스트A", null);
    }

    private void assertThatThrownByLogin() {
        org.assertj.core.api.Assertions
                .assertThatThrownBy(this::login)
                .isInstanceOf(GoogleUserUpserter.AccountInactiveException.class);
    }

    private int countRows(String table) {
        Integer count = jdbcTemplate.queryForObject("SELECT count(*) FROM " + table, Integer.class);
        return count == null ? 0 : count;
    }
}
