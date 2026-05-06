package com.dumpit.service;

import com.dumpit.dto.TaskPlanningResponse;

public interface TaskPlanningService {
    TaskPlanningResponse getPlanning(String email);
}
