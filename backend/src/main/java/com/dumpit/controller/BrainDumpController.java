package com.dumpit.controller;

import com.dumpit.dto.DumpRequest;
import com.dumpit.dto.DumpResponse;
import com.dumpit.dto.DumpTaskItem;
import com.dumpit.service.BrainDumpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

        List<DumpTaskItem> tasks = result.tasks().stream().map(DumpTaskItem::from).toList();
        return ResponseEntity.ok(new DumpResponse(result.dumpId(), tasks));
    }
}
