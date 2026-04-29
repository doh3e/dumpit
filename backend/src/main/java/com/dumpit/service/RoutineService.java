package com.dumpit.service;

import com.dumpit.dto.RoutineRequest;
import com.dumpit.entity.Routine;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RoutineService {

    List<Routine> getRoutines(String email);

    Routine createRoutine(String email, RoutineRequest request);

    Routine updateRoutine(String email, UUID routineId, RoutineRequest request);

    Routine toggleRoutine(String email, UUID routineId, boolean enabled);

    void deleteRoutine(String email, UUID routineId);

    int generateDueRoutines();

    boolean shouldGenerateOn(Routine routine, LocalDate date);
}
