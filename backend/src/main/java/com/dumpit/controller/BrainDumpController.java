package com.dumpit.controller;

import com.dumpit.dto.DumpConfirmRequest;
import com.dumpit.dto.DumpRequest;
import com.dumpit.dto.DumpResponse;
import com.dumpit.dto.DumpTaskItem;
import com.dumpit.entity.Task;
import com.dumpit.service.BrainDumpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/brain-dump")
@RequiredArgsConstructor
public class BrainDumpController {

    private final BrainDumpService brainDumpService;

    @PostMapping
    public ResponseEntity<DumpResponse> submitDump(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody DumpRequest req) {

        BrainDumpService.BrainDumpResult result =
                brainDumpService.analyze(principal.getAttribute("email"), req.rawText());

        List<DumpTaskItem> tasks = result.tasks().stream()
                .map(DumpTaskItem::fromProposal)
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(new DumpResponse(result.dumpId(), tasks));
    }

    @PostMapping("/{dumpId}/confirm")
    public ResponseEntity<List<DumpTaskItem>> confirmDump(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID dumpId,
            @Valid @RequestBody DumpConfirmRequest req) {

        List<Task> saved = brainDumpService.confirm(
                principal.getAttribute("email"), dumpId, req.tasks());
        List<DumpTaskItem> items = saved.stream().map(DumpTaskItem::from).toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(items);
    }
}
