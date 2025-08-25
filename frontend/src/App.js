// App.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import './App.css';

// Define subject names in a constant for easy reuse
const SUBJECTS = ['tamil', 'english', 'maths', 'science', 'social'];

// --- Main App Component ---
function App() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/students');
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

      <StudentForm onStudentAdded={fetchStudentData} />

      <div className="marklist-container">
        <h2><i className="icon">📊</i> Generated Mark Lists</h2>
        <div className="table-wrapper glass-effect">
          <MarklistTable students={students} isLoading={isLoading} error={error} />
        </div>
      </div>
    </div>
  );
}


// --- Form Component ---
function StudentForm({ onStudentAdded }) {
  const initialFormState = {
    studentName: '',
    registerNumber: '',
    tamil: '',
    english: '',
    maths: '',
    science: '',
    social: '',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/students', formData);
      setMessage({ text: 'Student added successfully!', type: 'success' });
      setFormData(initialFormState);
      onStudentAdded();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add student';
      setMessage({ text: `Error: ${errorMessage}`, type: 'error' });
      console.error('Submit error:', error);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="form-container glass-effect">
      <h2><i className="icon">📝</i> Add New Student</h2>
      <form onSubmit={handleSubmit}>
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
            {SUBJECTS.map(subject => (
              <div className="form-group" key={subject}>
                <label htmlFor={subject}>{subject.toUpperCase()}</label>
                <input type="number" id={subject} value={formData[subject]} onChange={handleChange} min="0" max="100" placeholder="e.g., 95" required />
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [currentStudent, setCurrentStudent] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleGetFeedback = async (student) => {
        setCurrentStudent(student);
        setIsModalOpen(true);
        setIsAiLoading(true);
        try {
            const response = await axios.post(`/api/students/${student._id}/feedback`);
            setFeedback(response.data.feedback);
        } catch (err) {
            setFeedback('Sorry, we could not generate feedback at this time.');
            console.error('AI Feedback error:', err);
        } finally {
            setIsAiLoading(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFeedback('');
        setCurrentStudent(null);
    };
    
    // *** PDF FIX IS HERE ***
    const generatePDF = (student) => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Student Report Card', 105, 20, null, null, 'center');
        doc.setFontSize(12);
        doc.text(`Student Name: ${student.studentName}`, 20, 40);
        doc.text(`Register Number: ${student.registerNumber}`, 20, 50);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 140, 40);

        const tableBody = SUBJECTS.map(subject => [
            subject.toUpperCase(),
            student[subject]
        ]);

        doc.autoTable({
            startY: 60,
            head: [['Subject', 'Marks Obtained (out of 100)']],
            body: tableBody,
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

    if (isLoading) return <div className="spinner-container"><div className="spinner"></div></div>;
    if (error) return <p className="error-message">{error}</p>;
    if (students.length === 0) return <p className="empty-message">No student data found.</p>;

    return (
        <>
            <table>
                <thead>
                    <tr>
                        <th>Reg. No.</th>
                        <th>Name</th>
                        {SUBJECTS.map(s => <th key={s}>{s.slice(0, 3).toUpperCase()}</th>)}
                        <th>Total</th>
                        <th>Avg.</th>
                        <th>Grade</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map(student => (
                        <tr key={student._id}>
                            <td>{student.registerNumber}</td>
                            <td>{student.studentName}</td>
                            {SUBJECTS.map(s => <td key={s}>{student[s]}</td>)}
                            <td><b>{student.total}</b></td>
                            <td>{student.average.toFixed(2)}</td>
                            <td><b>{student.grade}</b></td>
                            <td className="actions-cell">
                                <button className="pdf-btn" onClick={() => generatePDF(student)}>PDF</button>
                                <button className="ai-btn" onClick={() => handleGetFeedback(student)}>AI Feedback</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {isModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content glass-effect">
                        <h3>AI Performance Analysis for {currentStudent?.studentName}</h3>
                        {isAiLoading ? (
                            <div className="spinner-container"><div className="spinner"></div></div>
                        ) : (
                            <p className="feedback-text">{feedback}</p>
                        )}
                        <button onClick={closeModal} className="close-btn">Close</button>
                    </div>
                </div>
            )}
        </>
    );
}

export default App;
