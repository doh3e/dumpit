package com.dumpit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoutineScheduler {

    private final RoutineService routineService;

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Seoul")
    public void generateDueRoutines() {
        int generated = routineService.generateDueRoutines();
        if (generated > 0) {
            log.info("Generated {} routine tasks", generated);
        }
    }
}
