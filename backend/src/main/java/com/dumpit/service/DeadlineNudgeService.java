package com.dumpit.service;

import com.dumpit.dto.DeadlineNudgeResponse;
import com.dumpit.entity.Task;

import java.util.List;

public interface DeadlineNudgeService {

    void index(Task task);

    void remove(Task task);

    List<DeadlineNudgeResponse> getNudges(String email);
}
