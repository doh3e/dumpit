package com.dumpit.service;

import com.dumpit.dto.DumpConfirmRequest;
import com.dumpit.entity.Task;

import java.util.List;
import java.util.UUID;

public interface BrainDumpService {

    BrainDumpResult analyze(String email, String rawText);

    List<Task> confirm(String email, UUID dumpId, List<DumpConfirmRequest.TaskInput> tasks);

    record BrainDumpResult(UUID dumpId, List<com.dumpit.service.OpenAiService.BrainDumpTask> tasks) {}
}
