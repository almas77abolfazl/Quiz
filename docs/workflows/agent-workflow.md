# Agent Workflow

This document outlines the standard workflow for AI agents operating in this repository.

## 1. Task Entry
Always begin a task by performing the entry check to ensure the working tree is clean and synchronized. Read the root `AGENTS.md` and only the documents relevant to the current task.

## 2. Targeted Reading
Do not read all documentation by default. Use the Reading Map in `AGENTS.md` to identify the minimum necessary documents for the task type. Avoid unnecessary broad audits unless explicitly instructed.

## 3. Plan & Implementation
- If the task is complex, requires architectural changes, or involves ambiguity, create a detailed implementation plan in an artifact and await user approval.
- Execute the plan methodically, ensuring that product rules and security boundaries are respected.

## 4. Verification
Run the mandatory verification commands outlined in `verification.md` and `AGENTS.md` to guarantee the changes are sound.

## 5. Handoff
Provide a final report detailing what was changed, the verification results, and any open decisions or anomalies encountered. Include a clear stop condition and never commit or push unless explicitly authorized.

