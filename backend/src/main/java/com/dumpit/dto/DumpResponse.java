package com.dumpit.dto;

import java.util.List;
import java.util.UUID;

public record DumpResponse(UUID dumpId, List<DumpTaskItem> tasks) {}
