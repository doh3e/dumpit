package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_equipments",
       uniqueConstraints = @UniqueConstraint(name = "uk_user_equipments_user_slot",
                                             columnNames = {"user_id", "slot"}))
@Getter
@NoArgsConstructor
public class UserEquipment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "equipment_id")
    private UUID equipmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String slot;

    @Column(name = "item_code", nullable = false, length = 64)
    private String itemCode;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public static UserEquipment of(User user, String slot, String itemCode) {
        UserEquipment e = new UserEquipment();
        e.user = user;
        e.slot = slot;
        e.itemCode = itemCode;
        return e;
    }

    public void changeItem(String itemCode) { this.itemCode = itemCode; }
}
