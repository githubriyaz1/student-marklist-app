// App.js

import React, { useState, useEffect } from 'react';
import axios from 'axios'; // For making API calls
import { jsPDF } from "jspdf"; // For PDF generation
import "jspdf-autotable"; // For tables in PDF
import './App.css'; // Import our styles

// --- Main App Component ---
function App() {
  // State variables to hold our data
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // This function runs once when the component loads
  useEffect(() => {
    fetchStudentData();
  }, []);

  // --- Function to fetch student data from the backend ---
  const fetchStudentData = async () => {
    try {
      setIsLoading(true);
      // The '/api/students' URL works because of the proxy we will set up
      const response = await axios.get('/api/students');
      // Sort students by creation date, newest first
      const sortedStudents = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setStudents(sortedStudents);
      setError(null);
    } catch (err) {
      setError('Error fetching data. Is the backend server running?');
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Student Mark List Generator</h1>
        <p>Enter student details and marks to generate a comprehensive report card.</p>
      </header>

      {/* We pass the fetch function to the form so it can refresh the list */}
      <StudentForm onStudentAdded={fetchStudentData} />

      <div className="marklist-container">
        <h2><i className="icon">📊</i> Generated Mark Lists</h2>
        <div className="table-wrapper glass-effect">
          {/* We pass the student data and loading status to the table */}
          <MarklistTable students={students} isLoading={isLoading} error={error} />
        </div>
      </div>
    </div>
  );
}


// --- Form Component ---
function StudentForm({ onStudentAdded }) {
  const [formData, setFormData] = useState({
    studentName: '',
    registerNumber: '',
    subject1: '',
    subject2: '',
    subject3: '',
    subject4: '',
    subject5: '',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Post the form data to the backend
      await axios.post('/api/students', formData);
      setMessage({ text: 'Student added successfully!', type: 'success' });
      setFormData({ studentName: '', registerNumber: '', subject1: '', subject2: '', subject3: '', subject4: '', subject5: '' });
      onStudentAdded(); // Trigger data refresh in the parent component
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add student';
      setMessage({ text: `Error: ${errorMessage}`, type: 'error' });
      console.error('Submit error:', error);
    }
    // Clear the message after 3 seconds
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="form-container glass-effect">
      <h2><i className="icon">📝</i> Add New Student</h2>
      <form onSubmit={handleSubmit}>
        {/* Input fields for student details and marks */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="studentName">Student Name</label>
            <input type="text" id="studentName" value={formData.studentName} onChange={handleChange} placeholder="e.g., John Doe" required />
          </div>
          <div className="form-group">
            <label htmlFor="registerNumber">Register Number</label>
            <input type="text" id="registerNumber" value={formData.registerNumber} onChange={handleChange} placeholder="e.g., 21CS001" required />
          </div>
        </div>
        <fieldset>
          <legend>Enter Marks (out of 100)</legend>
          <div className="marks-row">
            {/* Dynamically create 5 subject input fields */}
            {[1, 2, 3, 4, 5].map(num => (
              <div className="form-group" key={num}>
                <label htmlFor={`subject${num}`}>Subject {num}</label>
                <input type="number" id={`subject${num}`} value={formData[`subject${num}`]} onChange={handleChange} min="0" max="100" placeholder="e.g., 95" required />
              </div>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="submit-btn">Add Student & Generate List</button>
      </form>
      {message && <div id="form-message" className={message.type}>{message.text}</div>}
    </div>
  );
}


// --- Table Component ---
function MarklistTable({ students, isLoading, error }) {
  const generatePDF = (student) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Student Report Card', 105, 20, null, null, 'center');
    doc.setFontSize(12);
    doc.text(`Student Name: ${student.studentName}`, 20, 40);
    doc.text(`Register Number: ${student.registerNumber}`, 20, 50);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 140, 40);
    doc.autoTable({
        startY: 60,
        head: [['Subject', 'Marks Obtained (out of 100)']],
        body: [
            ['Subject 1', student.subject1],
            ['Subject 2', student.subject2],
            ['Subject 3', student.subject3],
            ['Subject 4', student.subject4],
            ['Subject 5', student.subject5],
        ],
        theme: 'grid',
        headStyles: { fillColor: [72, 93, 166] }
    });
    let finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Result Summary', 20, finalY);
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Marks: ${student.total} / 500`, 20, finalY + 10);
    doc.text(`Average: ${student.average.toFixed(2)}%`, 20, finalY + 20);
    doc.text(`Grade: ${student.grade}`, 20, finalY + 30);
    doc.save(`${student.registerNumber}_${student.studentName}_report.pdf`);
  };

  if (isLoading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (students.length === 0) {
    return <p className="empty-message">No student data found. Add a student to get started.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Reg. No.</th>
          <th>Name</th>
          <th>Sub 1</th>
          <th>Sub 2</th>
          <th>Sub 3</th>
          <th>Sub 4</th>
          <th>Sub 5</th>
          <th>Total</th>
          <th>Average</th>
          <th>Grade</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {students.map(student => (
          <tr key={student._id}>
            <td>{student.registerNumber}</td>
            <td>{student.studentName}</td>
            <td>{student.subject1}</td>
            <td>{student.subject2}</td>
            <td>{student.subject3}</td>
            <td>{student.subject4}</td>
            <td>{student.subject5}</td>
            <td><b>{student.total}</b></td>
            <td>{student.average.toFixed(2)}</td>
            <td><b>{student.grade}</b></td>
            <td>
              <button className="pdf-btn" onClick={() => generatePDF(student)}>PDF</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default App;
