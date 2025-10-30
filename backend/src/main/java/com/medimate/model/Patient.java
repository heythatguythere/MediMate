package com.medimate.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "patients")
public class Patient {
    @Id
    private String id;
    
    private String caretakerId;
    private String name;
    private String age;
    private String condition;
    private String status; // Active, Inactive
    private String lastCheckup;
    private String nextAppointment;
    private String contactNumber;
    private String email;
    private String address;
    private String dob;
    private String emergencyContact;
    private String bloodGroup;
    private String allergies;
    private String notes;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCaretakerId() { return caretakerId; }
    public void setCaretakerId(String caretakerId) { this.caretakerId = caretakerId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAge() { return age; }
    public void setAge(String age) { this.age = age; }
    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLastCheckup() { return lastCheckup; }
    public void setLastCheckup(String lastCheckup) { this.lastCheckup = lastCheckup; }
    public String getNextAppointment() { return nextAppointment; }
    public void setNextAppointment(String nextAppointment) { this.nextAppointment = nextAppointment; }
    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getDob() { return dob; }
    public void setDob(String dob) { this.dob = dob; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }
    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }
    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
