package com.dumpit.service;

import com.dumpit.entity.Task;

import java.util.List;
import java.util.UUID;

public interface BrainDumpService {

    BrainDumpResult analyze(String email, String rawText);

    record BrainDumpResult(UUID dumpId, List<Task> tasks) {}
}
