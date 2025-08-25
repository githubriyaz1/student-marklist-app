// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Get references to HTML elements ---
    const studentForm = document.getElementById('addStudentForm');
    const marklistBody = document.getElementById('marklist-body');
    const formMessage = document.getElementById('form-message');
    const loadingSpinner = document.getElementById('loading-spinner');

    // Use a relative path for the API URL. This is more flexible.
    const API_URL = '/api/students'; // <-- *** THIS IS THE FIX ***

    // --- 2. Function to fetch and display student data ---
    const fetchStudentData = async () => {
        marklistBody.innerHTML = ''; // Clear existing table data
        loadingSpinner.style.display = 'flex'; // Show spinner

        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const students = await response.json();
            
            // Sort students by creation date, newest first
            students.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            displayStudents(students);

        } catch (error) {
            marklistBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color: #ff5c5c;">Error fetching data. Is the server running?</td></tr>`;
            console.error('Fetch error:', error);
        } finally {
            loadingSpinner.style.display = 'none'; // Hide spinner
        }
    };

    // --- 3. Function to display students in the table ---
    const displayStudents = (students) => {
        if (students.length === 0) {
            marklistBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">No student data found. Add a student to get started.</td></tr>`;
            return;
        }

        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.registerNumber}</td>
                <td>${student.studentName}</td>
                <td>${student.subject1}</td>
                <td>${student.subject2}</td>
                <td>${student.subject3}</td>
                <td>${student.subject4}</td>
                <td>${student.subject5}</td>
                <td><b>${student.total}</b></td>
                <td>${student.average.toFixed(2)}</td>
                <td><b>${student.grade}</b></td>
                <td><button class="pdf-btn" data-id="${student._id}">PDF</button></td>
            `;
            marklistBody.appendChild(row);

            // Add event listener to the new PDF button
            row.querySelector('.pdf-btn').addEventListener('click', () => {
                generatePDF(student);
            });
        });
    };

    // --- 4. Handle form submission to add a new student ---
    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission

        // Get form data
        const studentData = {
            studentName: document.getElementById('studentName').value,
            registerNumber: document.getElementById('registerNumber').value,
            subject1: parseInt(document.getElementById('subject1').value),
            subject2: parseInt(document.getElementById('subject2').value),
            subject3: parseInt(document.getElementById('subject3').value),
            subject4: parseInt(document.getElementById('subject4').value),
            subject5: parseInt(document.getElementById('subject5').value),
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to add student');
            }
            
            // Display success message
            formMessage.textContent = 'Student added successfully!';
            formMessage.style.color = '#36C486';
            studentForm.reset(); // Clear the form
            
            // Refresh the student list
            fetchStudentData();

        } catch (error) {
            formMessage.textContent = `Error: ${error.message}`;
            formMessage.style.color = '#ff5c5c';
            console.error('Submit error:', error);
        }

        // Clear the message after 3 seconds
        setTimeout(() => { formMessage.textContent = ''; }, 3000);
    });
    
    // --- 5. Function to generate a PDF report card ---
    const generatePDF = (student) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add Header
        doc.setFontSize(20);
        doc.text('Student Report Card', 105, 20, null, null, 'center');

        // Add Student Details
        doc.setFontSize(12);
        doc.text(`Student Name: ${student.studentName}`, 20, 40);
        doc.text(`Register Number: ${student.registerNumber}`, 20, 50);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 140, 40);

        // Add Table using jspdf-autotable
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

        // Add Summary Section
        let finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Result Summary', 20, finalY);
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Marks: ${student.total} / 500`, 20, finalY + 10);
        doc.text(`Average: ${student.average.toFixed(2)}%`, 20, finalY + 20);
        doc.text(`Grade: ${student.grade}`, 20, finalY + 30);
        
        // Save the PDF
        doc.save(`${student.registerNumber}_${student.studentName}_report.pdf`);
    };


    // --- 6. Initial data fetch when the page loads ---
    fetchStudentData();
});
