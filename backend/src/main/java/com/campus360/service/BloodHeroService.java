package com.campus360.service;

import com.campus360.dto.*;
import com.campus360.entity.BloodDonation;
import com.campus360.entity.BloodDonor;
import com.campus360.entity.BloodRequest;
import com.campus360.entity.Student;
import com.campus360.repository.BloodDonationRepository;
import com.campus360.repository.BloodDonorRepository;
import com.campus360.repository.BloodRequestRepository;
import com.campus360.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BloodHeroService {

    @Autowired
    private BloodDonorRepository donorRepository;

    @Autowired
    private BloodRequestRepository requestRepository;

    @Autowired
    private BloodDonationRepository donationRepository;

    @Autowired
    private StudentRepository studentRepository;

    // Standard medical whole blood compatibility map
    private static final Map<String, List<String>> COMPATIBILITY_MAP = new HashMap<>();

    static {
        COMPATIBILITY_MAP.put("O-", List.of("O-"));
        COMPATIBILITY_MAP.put("O+", List.of("O-", "O+"));
        COMPATIBILITY_MAP.put("A-", List.of("O-", "A-"));
        COMPATIBILITY_MAP.put("A+", List.of("O-", "O+", "A-", "A+"));
        COMPATIBILITY_MAP.put("B-", List.of("O-", "B-"));
        COMPATIBILITY_MAP.put("B+", List.of("O-", "O+", "B-", "B+"));
        COMPATIBILITY_MAP.put("AB-", List.of("O-", "A-", "B-", "AB-"));
        COMPATIBILITY_MAP.put("AB+", List.of("O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"));
    }

    public List<String> getCompatibleDonorGroups(String recipientGroup) {
        if (recipientGroup == null) return Collections.emptyList();
        return COMPATIBILITY_MAP.getOrDefault(recipientGroup.trim().toUpperCase(), List.of(recipientGroup));
    }

    @Transactional
    public BloodDonorProfileDto registerOrUpdateDonor(Long studentId, BloodDonorRegistrationDto req) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with ID: " + studentId));

        BloodDonor donor = donorRepository.findByStudentId(studentId).orElse(new BloodDonor());
        donor.setStudentId(studentId);
        donor.setBloodGroup(req.getBloodGroup() != null ? req.getBloodGroup().toUpperCase() : "O+");
        donor.setIsAvailable(req.getIsAvailable() != null ? req.getIsAvailable() : true);
        donor.setLastDonationDate(req.getLastDonationDate());
        donor.setContactNumber(req.getContactNumber() != null ? req.getContactNumber() : "");
        donor.setHallOrArea(req.getHallOrArea());
        donor.setNotes(req.getNotes());

        donor = donorRepository.save(donor);
        return mapToDonorDto(donor, student);
    }

    public BloodDonorProfileDto getDonorProfile(Long studentId) {
        if (studentId == null) return null;
        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null) return null;

        Optional<BloodDonor> donorOpt = donorRepository.findByStudentId(studentId);
        return donorOpt.map(bloodDonor -> mapToDonorDto(bloodDonor, student)).orElse(null);
    }

    @Transactional
    public BloodDonorProfileDto toggleAvailability(Long studentId, Boolean isAvailable) {
        BloodDonor donor = donorRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("No donor registration found for this student."));

        donor.setIsAvailable(isAvailable);
        donor = donorRepository.save(donor);

        Student student = studentRepository.findById(studentId).orElse(null);
        return mapToDonorDto(donor, student);
    }

    public List<BloodDonorProfileDto> getAllDonors(String bloodGroup, Boolean availableOnly) {
        List<BloodDonor> donors = donorRepository.filterDonors(
                (bloodGroup != null && !bloodGroup.isBlank()) ? bloodGroup.toUpperCase() : null,
                availableOnly != null ? availableOnly : null
        );

        Map<Long, Student> studentMap = studentRepository.findAllById(
                donors.stream().map(BloodDonor::getStudentId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(Student::getId, s -> s));

        return donors.stream()
                .map(d -> mapToDonorDto(d, studentMap.get(d.getStudentId())))
                .collect(Collectors.toList());
    }

    public List<BloodDonorProfileDto> getMatchedDonorsForRequest(Long requestId) {
        BloodRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Blood request not found with ID: " + requestId));

        List<String> compatibleGroups = getCompatibleDonorGroups(req.getBloodGroup());
        List<BloodDonor> donors = donorRepository.findByBloodGroupInAndIsAvailableTrue(compatibleGroups);

        Map<Long, Student> studentMap = studentRepository.findAllById(
                donors.stream().map(BloodDonor::getStudentId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(Student::getId, s -> s));

        return donors.stream()
                .map(d -> mapToDonorDto(d, studentMap.get(d.getStudentId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public BloodEmergencyDetailDto createBloodRequest(Long requesterId, BloodEmergencyPostDto req) {
        Student requester = studentRepository.findById(requesterId)
                .orElseThrow(() -> new IllegalArgumentException("Requester not found with ID: " + requesterId));

        BloodRequest bloodReq = new BloodRequest();
        bloodReq.setRequesterId(requesterId);
        bloodReq.setPatientName(req.getPatientName() != null ? req.getPatientName() : "Emergency Patient");
        bloodReq.setBloodGroup(req.getBloodGroup() != null ? req.getBloodGroup().toUpperCase() : "O+");
        bloodReq.setUnitsNeeded(req.getUnitsNeeded() != null && req.getUnitsNeeded() > 0 ? req.getUnitsNeeded() : 1);
        bloodReq.setUnitsFulfilled(0);
        bloodReq.setHospitalName(req.getHospitalName() != null ? req.getHospitalName() : "Hospital");
        bloodReq.setHospitalLocation(req.getHospitalLocation() != null ? req.getHospitalLocation() : "Dhaka");
        bloodReq.setWardBed(req.getWardBed());
        bloodReq.setUrgencyLevel(req.getUrgencyLevel() != null ? req.getUrgencyLevel().toUpperCase() : "SAME_DAY");
        bloodReq.setNeededDate(req.getNeededDate() != null ? req.getNeededDate() : LocalDateTime.now().plusHours(12));
        bloodReq.setContactNumber(req.getContactNumber() != null ? req.getContactNumber() : "");
        bloodReq.setPatientCondition(req.getPatientCondition());
        bloodReq.setIsAiVerified(req.getIsAiVerified() != null ? req.getIsAiVerified() : false);
        bloodReq.setAiFormattedBroadcast(req.getAiFormattedBroadcast());
        bloodReq.setStatus("OPEN");

        bloodReq = requestRepository.save(bloodReq);
        return mapToRequestDto(bloodReq, requester);
    }

    public List<BloodEmergencyDetailDto> getAllRequests(String status, String bloodGroup) {
        String cleanStatus = (status != null && !status.isBlank()) ? status.toUpperCase() : null;
        String cleanGroup = (bloodGroup != null && !bloodGroup.isBlank()) ? bloodGroup.toUpperCase() : null;

        List<BloodRequest> requests = requestRepository.filterRequests(cleanStatus, cleanGroup);

        Map<Long, Student> studentMap = studentRepository.findAllById(
                requests.stream().map(BloodRequest::getRequesterId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(Student::getId, s -> s));

        return requests.stream()
                .map(r -> mapToRequestDto(r, studentMap.get(r.getRequesterId())))
                .collect(Collectors.toList());
    }

    public BloodEmergencyDetailDto getRequestById(Long requestId) {
        BloodRequest r = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Blood request not found with ID: " + requestId));
        Student requester = studentRepository.findById(r.getRequesterId()).orElse(null);
        return mapToRequestDto(r, requester);
    }

    public List<BloodEmergencyDetailDto> getMyRequests(Long requesterId) {
        List<BloodRequest> list = requestRepository.findByRequesterIdOrderByCreatedAtDesc(requesterId);
        Student requester = studentRepository.findById(requesterId).orElse(null);
        return list.stream()
                .map(r -> mapToRequestDto(r, requester))
                .collect(Collectors.toList());
    }

    @Transactional
    public BloodEmergencyDetailDto resolveManagedOutside(Long requestId, Long userId, String source, String notes, Integer unitsAdded, Boolean markClosed) {
        BloodRequest r = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Blood request not found with ID: " + requestId));

        if (!r.getRequesterId().equals(userId)) {
            throw new SecurityException("Only the original requester can update this emergency request.");
        }

        if (unitsAdded != null && unitsAdded > 0) {
            int newFulfilled = r.getUnitsFulfilled() + unitsAdded;
            r.setUnitsFulfilled(Math.min(r.getUnitsNeeded(), newFulfilled));
        }

        if (source != null && !source.isBlank()) {
            r.setResolutionSource(source.trim());
        }

        if (notes != null && !notes.isBlank()) {
            r.setResolutionNotes(notes.trim());
        }

        if (Boolean.TRUE.equals(markClosed) || r.getUnitsFulfilled() >= r.getUnitsNeeded()) {
            r.setStatus(r.getUnitsFulfilled() >= r.getUnitsNeeded() ? "FULFILLED" : "CLOSED");
        }

        r = requestRepository.save(r);
        Student requester = studentRepository.findById(r.getRequesterId()).orElse(null);
        return mapToRequestDto(r, requester);
    }

    @Transactional
    public BloodEmergencyDetailDto updateRequestStatus(Long requestId, Long userId, String newStatus) {
        BloodRequest r = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Blood request not found."));

        // Only requester or admin can update status
        if (!r.getRequesterId().equals(userId)) {
            throw new SecurityException("Only the original requester can update this emergency status.");
        }

        r.setStatus(newStatus.toUpperCase());
        if ("FULFILLED".equalsIgnoreCase(newStatus)) {
            r.setUnitsFulfilled(r.getUnitsNeeded());
        }
        r = requestRepository.save(r);

        Student requester = studentRepository.findById(r.getRequesterId()).orElse(null);
        return mapToRequestDto(r, requester);
    }

    @Transactional
    public BloodEmergencyDetailDto recordDonation(Long requestId, Long donorStudentId, String notes) {
        BloodRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Blood request not found."));

        BloodDonor donor = donorRepository.findByStudentId(donorStudentId)
                .orElseThrow(() -> new IllegalArgumentException("You must be registered as a donor first."));

        BloodDonation donation = new BloodDonation();
        donation.setRequestId(requestId);
        donation.setDonorId(donor.getId());
        donation.setDonationDate(LocalDate.now());
        donation.setNotes(notes);
        donationRepository.save(donation);

        // Update donor stats
        donor.setTotalDonations(donor.getTotalDonations() + 1);
        donor.setLastDonationDate(LocalDate.now());
        donorRepository.save(donor);

        // Increment request fulfillment
        req.setUnitsFulfilled(req.getUnitsFulfilled() + 1);
        if (req.getUnitsFulfilled() >= req.getUnitsNeeded()) {
            req.setStatus("FULFILLED");
        }
        req = requestRepository.save(req);

        Student requester = studentRepository.findById(req.getRequesterId()).orElse(null);
        return mapToRequestDto(req, requester);
    }

    public Map<String, Object> getLiveStats() {
        long totalDonors = donorRepository.count();
        long activeDonors = donorRepository.findByIsAvailableTrue().size();
        long openRequests = requestRepository.findByStatusOrderByCreatedAtDesc("OPEN").size();
        long fulfilledRequests = requestRepository.findByStatusOrderByCreatedAtDesc("FULFILLED").size();
        long totalDonations = donationRepository.count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalDonors", totalDonors);
        stats.put("activeDonors", activeDonors);
        stats.put("openRequests", openRequests);
        stats.put("fulfilledRequests", fulfilledRequests);
        stats.put("totalDonations", totalDonations);
        return stats;
    }

    private BloodDonorProfileDto mapToDonorDto(BloodDonor d, Student s) {
        LocalDate lastDate = d.getLastDonationDate();
        boolean cooldownOver = true;
        long daysUntil = 0;

        if (lastDate != null) {
            long daysSince = ChronoUnit.DAYS.between(lastDate, LocalDate.now());
            if (daysSince < 90) {
                cooldownOver = false;
                daysUntil = 90 - daysSince;
            }
        }

        return BloodDonorProfileDto.builder()
                .id(d.getId())
                .studentId(d.getStudentId())
                .studentName(s != null ? s.getFullName() : "Campus Student")
                .studentEmail(s != null ? s.getEmail() : "")
                .universityId(s != null ? s.getUniversityId() : "")
                .departmentName(s != null && s.getDepartmentId() != null ? "CSE / Tech" : "General")
                .bloodGroup(d.getBloodGroup())
                .isAvailable(d.getIsAvailable())
                .lastDonationDate(d.getLastDonationDate())
                .contactNumber(d.getContactNumber())
                .hallOrArea(d.getHallOrArea())
                .totalDonations(d.getTotalDonations())
                .notes(d.getNotes())
                .isCooldownOver(cooldownOver)
                .daysUntilEligible(daysUntil)
                .createdAt(d.getCreatedAt())
                .build();
    }

    private BloodEmergencyDetailDto mapToRequestDto(BloodRequest r, Student requester) {
        List<String> compatibleGroups = getCompatibleDonorGroups(r.getBloodGroup());
        long matchingCount = donorRepository.findByBloodGroupInAndIsAvailableTrue(compatibleGroups).size();

        return BloodEmergencyDetailDto.builder()
                .id(r.getId())
                .requesterId(r.getRequesterId())
                .requesterName(requester != null ? requester.getFullName() : "Campus Peer")
                .requesterEmail(requester != null ? requester.getEmail() : "")
                .patientName(r.getPatientName())
                .bloodGroup(r.getBloodGroup())
                .unitsNeeded(r.getUnitsNeeded())
                .unitsFulfilled(r.getUnitsFulfilled())
                .hospitalName(r.getHospitalName())
                .hospitalLocation(r.getHospitalLocation())
                .wardBed(r.getWardBed())
                .urgencyLevel(r.getUrgencyLevel())
                .neededDate(r.getNeededDate())
                .contactNumber(r.getContactNumber())
                .patientCondition(r.getPatientCondition())
                .isAiVerified(r.getIsAiVerified())
                .aiFormattedBroadcast(r.getAiFormattedBroadcast())
                .status(r.getStatus())
                .resolutionSource(r.getResolutionSource())
                .resolutionNotes(r.getResolutionNotes())
                .createdAt(r.getCreatedAt())
                .compatibleBloodGroups(compatibleGroups)
                .compatibleDonorsCount(matchingCount)
                .build();
    }
}
