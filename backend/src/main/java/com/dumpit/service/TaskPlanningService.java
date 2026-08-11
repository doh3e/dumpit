package com.dumpit.service;

import com.dumpit.dto.TaskPlanningResponse;
import com.dumpit.dto.TaskResponse;

import java.util.List;

public interface TaskPlanningService {
    TaskPlanningResponse getPlanning(String email);

    List<TaskResponse> todayTasks(String email);
}
