package com.campus360.service;

import com.campus360.dto.*;
import com.campus360.entity.*;
import com.campus360.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CoursePlannerService {

    @Autowired
    private CurriculumCourseRepository curriculumCourseRepo;

    @Autowired
    private CurriculumPrerequisiteRepository prerequisiteRepo;

    @Autowired
    private CurriculumSpecializationRepository specializationRepo;

    @Autowired
    private SpecializationCourseRepository specCourseRepo;

    @Autowired
    private CoursePlanRepository planRepo;

    @Autowired
    private DepartmentRepository departmentRepo;

    @Autowired
    private GeminiApiClient geminiClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─── Curriculum data endpoints ───────────────────────────────────────

    public List<CurriculumCourseDTO> getCurriculumCourses(Integer departmentId) {
        return curriculumCourseRepo.findByDepartmentIdAndIsActiveTrue(departmentId)
                .stream()
                .map(this::mapToCurriculumDTO)
                .collect(Collectors.toList());
    }

    public List<SpecializationDTO> getSpecializations(Integer departmentId) {
        return specializationRepo.findByDepartmentId(departmentId)
                .stream()
                .map(this::mapToSpecDTO)
                .collect(Collectors.toList());
    }

    // ─── Plan generation ─────────────────────────────────────────────────

    @Transactional
    public CoursePlanResponse generatePlan(CoursePlanRequest request, Long studentId) {
        // Validate department
        departmentRepo.findById(request.getDepartmentId().longValue())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));

        // Load curriculum data
        List<CurriculumCourse> allCourses = curriculumCourseRepo.findByDepartmentIdAndIsActiveTrue(request.getDepartmentId());
        if (allCourses.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No curriculum data found for this department");
        }

        List<Integer> courseIds = allCourses.stream().map(CurriculumCourse::getId).collect(Collectors.toList());
        List<CurriculumPrerequisite> prerequisites = prerequisiteRepo.findByCourseIdIn(courseIds);

        // Load specialization info
        String specializationName = null;
        List<String> specCourseCodes = new ArrayList<>();
        if (request.getSpecializationId() != null) {
            CurriculumSpecialization spec = specializationRepo.findById(request.getSpecializationId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Specialization not found"));
            specializationName = spec.getName();

            List<SpecializationCourse> specCourses = specCourseRepo.findBySpecializationId(spec.getId());
            for (SpecializationCourse sc : specCourses) {
                allCourses.stream()
                        .filter(c -> c.getId().equals(sc.getCourseId()))
                        .findFirst()
                        .ifPresent(c -> specCourseCodes.add(c.getCourseCode()));
            }
        }

        // Build prompt
        String prompt = buildPrompt(allCourses, prerequisites, request, specializationName, specCourseCodes);

        // Call Gemini with retry
        String aiResponse = null;
        Exception lastError = null;
        for (int attempt = 0; attempt <= geminiClient.getMaxRetries(); attempt++) {
            try {
                aiResponse = geminiClient.generateContent(prompt);
                break;
            } catch (Exception e) {
                lastError = e;
                if (attempt < geminiClient.getMaxRetries()) {
                    prompt = prompt + "\n\nPREVIOUS ATTEMPT FAILED. Error: " + e.getMessage()
                            + "\nPlease try again and ensure the output is valid JSON.";
                }
            }
        }

        if (aiResponse == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI service unavailable after retries: " + (lastError != null ? lastError.getMessage() : "unknown error"));
        }

        // Parse and save plan
        return parseAndSavePlan(aiResponse, request, studentId, allCourses);
    }

    // ─── Plan CRUD ───────────────────────────────────────────────────────

    public Page<CoursePlanResponse> getMyPlans(Long studentId, Pageable pageable) {
        return planRepo.findByStudentIdOrderByCreatedAtDesc(studentId, pageable)
                .map(this::mapToPlanResponse);
    }

    public CoursePlanResponse getPlanById(Long planId, Long studentId) {
        CoursePlan plan = planRepo.findByIdAndStudentId(planId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found"));
        return mapToPlanResponse(plan);
    }

    @Transactional
    public void deletePlan(Long planId, Long studentId) {
        CoursePlan plan = planRepo.findByIdAndStudentId(planId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found"));
        planRepo.delete(plan);
    }

    // ─── Prompt building ─────────────────────────────────────────────────

    private String buildPrompt(List<CurriculumCourse> courses,
                               List<CurriculumPrerequisite> prerequisites,
                               CoursePlanRequest request,
                               String specializationName,
                               List<String> specCourseCodes) {

        // Build course lookup map
        Map<Integer, String> idToCode = courses.stream()
                .collect(Collectors.toMap(CurriculumCourse::getId, CurriculumCourse::getCourseCode));

        // Determine department-specific rules
        boolean isCSE = courses.stream().anyMatch(c -> c.getCourseCode().startsWith("CSE 1110"));
        int totalCreditsRequired = isCSE ? 141 : 138;
        int numElectives = isCSE ? 5 : 0; // DS uses option tracks instead

        // Build course list for prompt
        StringBuilder courseList = new StringBuilder();
        Map<String, List<CurriculumCourse>> byCategory = courses.stream()
                .collect(Collectors.groupingBy(CurriculumCourse::getCategory));

        for (Map.Entry<String, List<CurriculumCourse>> entry : byCategory.entrySet()) {
            courseList.append("\n### ").append(formatCategory(entry.getKey())).append(":\n");
            for (CurriculumCourse c : entry.getValue()) {
                courseList.append("- ").append(c.getCourseCode()).append(": ")
                        .append(c.getCourseName()).append(" (").append(c.getCredits()).append(" cr)");
                if (c.getSubCategory() != null) {
                    courseList.append(" [").append(c.getSubCategory()).append("]");
                }
                courseList.append("\n");
            }
        }

        // Build prerequisite list
        StringBuilder prereqList = new StringBuilder();
        for (CurriculumPrerequisite p : prerequisites) {
            String courseCode = idToCode.get(p.getCourseId());
            String prereqCode = idToCode.get(p.getPrerequisiteId());
            if (courseCode != null && prereqCode != null) {
                prereqList.append("- ").append(courseCode).append(" requires ").append(prereqCode).append("\n");
            }
        }

        // Build workload guidance
        String workloadGuide;
        switch (request.getWorkloadPref() != null ? request.getWorkloadPref() : "balanced") {
            case "light": workloadGuide = "9-10 credits per trimester (lighter load)"; break;
            case "heavy": workloadGuide = "13-15 credits per trimester (heavier load)"; break;
            default: workloadGuide = "10-13 credits per trimester (balanced)"; break;
        }

        // Build completed courses text
        String completedText = "";
        if (request.getCompletedCourseCodes() != null && !request.getCompletedCourseCodes().isEmpty()) {
            completedText = "ALREADY COMPLETED COURSES (do NOT include these in the plan):\n"
                    + String.join(", ", request.getCompletedCourseCodes()) + "\n\n";
        }

        // Build avoid courses text
        String avoidText = "";
        if (request.getAvoidCourseCodes() != null && !request.getAvoidCourseCodes().isEmpty()) {
            avoidText = "COURSES TO AVOID (do not schedule these as electives):\n"
                    + String.join(", ", request.getAvoidCourseCodes()) + "\n\n";
        }

        // Build skip trimesters text
        String skipText = "";
        if (request.getSkipTrimesters() != null && !request.getSkipTrimesters().isEmpty()) {
            skipText = "TRIMESTERS OFF (leave these trimesters empty):\n"
                    + request.getSkipTrimesters().stream().map(String::valueOf).collect(Collectors.joining(", ")) + "\n\n";
        }

        return String.format("""
            You are a university course planning advisor for United International University (UIU), Bangladesh.
            Your task is to create a complete %d-trimester course plan for a student.

            DEPARTMENT: %s
            TOTAL CREDITS REQUIRED: %d
            %s
            AVAILABLE COURSES:
            %s

            PREREQUISITES (a course CANNOT be scheduled before its prerequisites):
            %s

            %s%s%s

            STUDENT PREFERENCES:
            - Starting from Trimester: %d
            - Preferred workload: %s
            - Interests: %s

            STRICT RULES:
            1. Plan exactly 12 trimesters (numbered 1-12). Empty trimesters for breaks are allowed.
            2. Target %s per trimester.
            3. ALL prerequisites MUST be completed in an EARLIER trimester before scheduling a course.
            4. ALL compulsory/core courses MUST be included.
            5. %s
            6. The plan must include all required general education courses (compulsory + pick 3 optionals).
            7. Total credits across all trimesters must equal exactly %d.
            8. No course should appear more than once.
            9. Group related lab courses with their theory courses in the same trimester.
            10. For elective/optional courses, prefer courses matching the student's interests.

            OUTPUT FORMAT - Return ONLY valid JSON matching this exact structure (keep it EXTREMELY compact, NO spaces, NO newlines):
            {"t":[["ENG 1011","CSE 1111"],["MAT 1101"]]}
            """,
            12,
            isCSE ? "Computer Science and Engineering (CSE)" : "Data Science (DS)",
            totalCreditsRequired,
            specializationName != null ?
                    "SPECIALIZATION: " + specializationName + "\nSpecialization elective courses: " + String.join(", ", specCourseCodes) + "\n" : "",
            courseList.toString(),
            prereqList.toString(),
            completedText,
            avoidText,
            skipText,
            request.getCurrentTrimester() != null ? request.getCurrentTrimester() : 1,
            workloadGuide,
            request.getInterestText() != null ? request.getInterestText() : "No specific preference",
            workloadGuide,
            isCSE ?
                    "Pick exactly 5 elective courses (15 credits). At least 4 must be from the chosen specialization track." :
                    "Pick exactly 4 Option-I courses (12 credits) AND 4 Option-II courses (12 credits). Pick 2 Systems Optional courses (6 credits).",
            totalCreditsRequired,
            totalCreditsRequired
        );
    }

    // ─── AI response parsing ─────────────────────────────────────────────

    @Transactional
    private CoursePlanResponse parseAndSavePlan(String aiJson, CoursePlanRequest request, Long studentId,
                                                List<CurriculumCourse> allCourses) {
        try {
            // Build lookup map
            Map<String, CurriculumCourse> codeToEntity = allCourses.stream()
                    .collect(Collectors.toMap(CurriculumCourse::getCourseCode, c -> c, (a, b) -> a));

            // Sanitize markdown blocks often returned by LLMs
            if (aiJson != null) {
                aiJson = aiJson.trim();
                if (aiJson.startsWith("```json")) {
                    aiJson = aiJson.substring(7);
                } else if (aiJson.startsWith("```")) {
                    aiJson = aiJson.substring(3);
                }
                if (aiJson.endsWith("```")) {
                    aiJson = aiJson.substring(0, aiJson.length() - 3);
                }
                aiJson = aiJson.trim();
            }

            JsonNode root = objectMapper.readTree(aiJson);

            // Deactivate previous active plans for this student
            List<CoursePlan> oldActivePlans = planRepo.findByStudentIdAndIsActiveTrue(studentId);
            for (CoursePlan old : oldActivePlans) {
                old.setIsActive(false);
                planRepo.save(old);
            }

            // Create new plan
            CoursePlan plan = new CoursePlan();
            plan.setStudentId(studentId);
            plan.setDepartmentId(request.getDepartmentId());
            plan.setSpecializationId(request.getSpecializationId());
            plan.setCurrentTrimester(request.getCurrentTrimester() != null ? request.getCurrentTrimester() : 1);
            plan.setWorkloadPref(request.getWorkloadPref() != null ? request.getWorkloadPref() : "balanced");
            plan.setInterestText(request.getInterestText());
            plan.setAiModelUsed(geminiClient.getModelName());
            plan.setPlanSummary("A personalized course plan based on your preferences.");

            BigDecimal totalCredits = BigDecimal.ZERO;

            JsonNode trimestersNode = root.path("t");
            if (!trimestersNode.isArray() && root.isArray()) {
                // Sometimes the model might just output the outer array directly
                trimestersNode = root;
            }
            if (!trimestersNode.isArray()) {
                // Fallback check
                trimestersNode = root.path("trimesters");
                if (!trimestersNode.isArray()) {
                    throw new RuntimeException("AI response missing 't' array");
                }
            }

            List<CoursePlanTrimester> trimesters = new ArrayList<>();
            int trimNumber = 1;
            
            for (JsonNode triNode : trimestersNode) {
                CoursePlanTrimester trimester = new CoursePlanTrimester();
                trimester.setPlan(plan);
                trimester.setTrimesterNumber(trimNumber++);
                trimester.setReasoning("");

                BigDecimal triCredits = BigDecimal.ZERO;
                List<CoursePlanItem> items = new ArrayList<>();

                // If the model still returned objects instead of an array of strings, handle it gracefully
                JsonNode coursesNode = triNode.isArray() ? triNode : triNode.path("courses");
                
                if (coursesNode.isArray()) {
                    for (JsonNode courseNode : coursesNode) {
                        String code;
                        if (courseNode.isTextual()) {
                            code = courseNode.asText();
                        } else {
                            code = courseNode.path("courseCode").asText();
                        }
                        
                        if (code == null || code.isEmpty()) continue;
                        
                        CurriculumCourse entity = codeToEntity.get(code);

                        CoursePlanItem item = new CoursePlanItem();
                        item.setPlanTrimester(trimester);
                        item.setCourseCode(code);

                        if (entity != null) {
                            item.setCurriculumCourseId(entity.getId());
                            item.setCredits(entity.getCredits());
                            item.setCourseName(entity.getCourseName());
                            item.setCategory(entity.getCategory());
                        } else {
                            item.setCurriculumCourseId(0);
                            item.setCredits(BigDecimal.valueOf(courseNode.path("credits").asDouble(3.0)));
                            item.setCourseName(courseNode.path("courseName").asText(code));
                            item.setCategory(courseNode.path("category").asText("core"));
                        }

                        triCredits = triCredits.add(item.getCredits());
                        items.add(item);
                    }
                }

                trimester.setTotalCredits(triCredits);
                trimester.setItems(items);
                totalCredits = totalCredits.add(triCredits);
                trimesters.add(trimester);
            }

            plan.setTotalCredits(totalCredits);
            plan.setTrimesters(trimesters);

            CoursePlan saved = planRepo.save(plan);
            return mapToPlanResponse(saved);

        } catch (Exception e) {
            System.err.println("=== AI JSON PARSING ERROR ===");
            System.err.println("Raw AI JSON was: " + aiJson);
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to parse AI response: " + e.getMessage());
        }
    }

    // ─── Mappers ─────────────────────────────────────────────────────────

    private CoursePlanResponse mapToPlanResponse(CoursePlan plan) {
        CoursePlanResponse response = new CoursePlanResponse();
        response.setId(plan.getId());
        response.setStudentId(plan.getStudentId());
        response.setDepartmentId(plan.getDepartmentId());
        response.setCurrentTrimester(plan.getCurrentTrimester());
        response.setWorkloadPref(plan.getWorkloadPref());
        response.setInterestText(plan.getInterestText());
        response.setTotalCredits(plan.getTotalCredits());
        response.setPlanSummary(plan.getPlanSummary());
        response.setAiModelUsed(plan.getAiModelUsed());
        response.setIsActive(plan.getIsActive());
        response.setCreatedAt(plan.getCreatedAt());

        // Department name
        departmentRepo.findById(plan.getDepartmentId().longValue())
                .ifPresent(d -> response.setDepartmentName(d.getName()));

        // Specialization name
        if (plan.getSpecializationId() != null) {
            response.setSpecializationId(plan.getSpecializationId());
            specializationRepo.findById(plan.getSpecializationId())
                    .ifPresent(s -> response.setSpecializationName(s.getName()));
        }

        // Trimesters
        if (plan.getTrimesters() != null) {
            List<TrimesterPlanDTO> triDTOs = plan.getTrimesters().stream()
                    .map(this::mapToTrimesterDTO)
                    .collect(Collectors.toList());
            response.setTrimesters(triDTOs);
        }

        return response;
    }

    private TrimesterPlanDTO mapToTrimesterDTO(CoursePlanTrimester tri) {
        TrimesterPlanDTO dto = new TrimesterPlanDTO();
        dto.setId(tri.getId());
        dto.setTrimesterNumber(tri.getTrimesterNumber());
        dto.setTotalCredits(tri.getTotalCredits());
        dto.setReasoning(tri.getReasoning());

        if (tri.getItems() != null) {
            dto.setCourses(tri.getItems().stream()
                    .map(this::mapToItemDTO)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private PlanCourseItemDTO mapToItemDTO(CoursePlanItem item) {
        PlanCourseItemDTO dto = new PlanCourseItemDTO();
        dto.setId(item.getId());
        dto.setCurriculumCourseId(item.getCurriculumCourseId());
        dto.setCourseCode(item.getCourseCode());
        dto.setCourseName(item.getCourseName());
        dto.setCredits(item.getCredits());
        dto.setCategory(item.getCategory());
        return dto;
    }

    private CurriculumCourseDTO mapToCurriculumDTO(CurriculumCourse c) {
        CurriculumCourseDTO dto = new CurriculumCourseDTO();
        dto.setId(c.getId());
        dto.setCourseCode(c.getCourseCode());
        dto.setCourseName(c.getCourseName());
        dto.setCredits(c.getCredits());
        dto.setCategory(c.getCategory());
        dto.setSubCategory(c.getSubCategory());
        return dto;
    }

    private SpecializationDTO mapToSpecDTO(CurriculumSpecialization s) {
        SpecializationDTO dto = new SpecializationDTO();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setMinCourses(s.getMinCourses());
        dto.setDescription(s.getDescription());
        return dto;
    }

    private String formatCategory(String category) {
        return category.replace("_", " ").substring(0, 1).toUpperCase() + category.replace("_", " ").substring(1);
    }
}
