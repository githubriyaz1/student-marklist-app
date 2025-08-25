// server.js

// --- 1. Import necessary modules ---
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// --- 2. Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- 3. Middleware Setup ---
app.use(cors());
app.use(bodyParser.json());

// --- 4. MongoDB Connection ---
const dbURI = process.env.DB_URI || 'mongodb+srv://students:23ITR061@cluster0.elnq9xz.mongodb.net/studentDB?retryWrites=true&w=majority&appName=Cluster0';


mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Successfully connected to MongoDB Atlas!'))
.catch(err => console.error('Error connecting to MongoDB:', err));


// --- 4.5 Serve Frontend Files ---
app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));


// --- 5. Define the Student Schema and Model ---
// *** THIS SECTION IS UPDATED with new subject names ***
const studentSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  registerNumber: { type: String, required: true, unique: true },
  tamil: { type: Number, required: true, min: 0, max: 100 },
  english: { type: Number, required: true, min: 0, max: 100 },
  maths: { type: Number, required: true, min: 0, max: 100 },
  science: { type: Number, required: true, min: 0, max: 100 },
  social: { type: Number, required: true, min: 0, max: 100 },
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);


// --- 6. API Routes ---

// GET all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({});
    
    const marklists = students.map(student => {
      // *** THIS SECTION IS UPDATED with new subject names ***
      const { tamil, english, maths, science, social } = student;
      const total = tamil + english + maths + science + social;
      const average = total / 5;
      
      let grade = 'F';
      if (average >= 90) grade = 'O';
      else if (average >= 80) grade = 'A+';
      else if (average >= 70) grade = 'A';
      else if (average >= 60) grade = 'B+';
      else if (average >= 50) grade = 'B';
      else if (average >= 40) grade = 'C';
      
      return {
        ...student.toObject(),
        total,
        average,
        grade,
      };
    });

    res.status(200).json(marklists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student data', error });
  }
});

// POST a new student
app.post('/api/students', async (req, res) => {
  try {
    // *** THIS SECTION IS UPDATED with new subject names ***
    const { studentName, registerNumber, tamil, english, maths, science, social } = req.body;

    if (!studentName || !registerNumber || tamil === undefined) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const newStudent = new Student({
      studentName,
      registerNumber,
      tamil: parseInt(tamil),
      english: parseInt(english),
      maths: parseInt(maths),
      science: parseInt(science),
      social: parseInt(social),
    });

    const savedStudent = await newStudent.save();
    res.status(201).json({ message: 'Student added successfully!', student: savedStudent });

  } catch (error) {
    if (error.code === 11000) {
        return res.status(409).json({ message: 'Error: Register number already exists.'});
    }
    console.error('Error saving student:', error);
    res.status(500).json({ message: 'Error saving student data', error });
  }
});


// --- 7. NEW AI FEEDBACK ROUTE ---
app.post('/api/students/:id/feedback', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // *** THIS SECTION IS UPDATED with new subject names ***
        const { studentName, tamil, english, maths, science, social } = student;
        const marks = `Tamil: ${tamil}, English: ${english}, Maths: ${maths}, Science: ${science}, Social: ${social}`;

        const prompt = `
            Act as an experienced academic advisor. Analyze the performance of a student named ${studentName}.
            The student's marks are: ${marks}.
            
            Provide a concise, constructive, and encouraging analysis in about 3-4 sentences.
            - Start by mentioning a positive aspect, if any.
            - Identify the areas that need improvement.
            - Suggest a key area to focus on for better results.
            - Do not use bullet points. Write it as a single paragraph.
        `;
        
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDqM-T9d3T1U79bHM7m7J_i-oATUDULQCM';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Gemini API Error:', errorBody);
            throw new Error(`Gemini API request failed with status ${response.status}`);
        }

        const result = await response.json();
        const feedback = result.candidates[0].content.parts[0].text;

        res.status(200).json({ feedback });

    } catch (error) {
        console.error('Error getting AI feedback:', error);
        res.status(500).json({ message: 'Failed to get AI feedback' });
    }
});


// The "catchall" handler
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});


// --- 8. Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
