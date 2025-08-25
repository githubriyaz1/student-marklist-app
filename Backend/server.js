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
    // Use the environment variable for the database URI for security.
    // The `||` provides a fallback for local development.
    const dbURI = process.env.DB_URI || 'mongodb+srv://students:23ITR061@cluster0.elnq9xz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    
    
    mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(err => console.error('Error connecting to MongoDB:', err));
    
    // --- 4.5 Serve Frontend Files ---
    // Serve files from the 'Frontend' directory, which is one level up.
    app.use(express.static(path.join(__dirname, '..', 'Frontend')));
    
    
    // --- 5. Define the Student Schema and Model ---
    const studentSchema = new mongoose.Schema({
      studentName: { type: String, required: true },
      registerNumber: { type: String, required: true, unique: true },
      subject1: { type: Number, required: true, min: 0, max: 100 },
      subject2: { type: Number, required: true, min: 0, max: 100 },
      subject3: { type: Number, required: true, min: 0, max: 100 },
      subject4: { type: Number, required: true, min: 0, max: 100 },
      subject5: { type: Number, required: true, min: 0, max: 100 },
    }, { timestamps: true });
    
    const Student = mongoose.model('Student', studentSchema);
    
    
    // --- 6. API Routes ---
    app.get('/api/students', async (req, res) => {
      try {
        const students = await Student.find({});
        
        const marklists = students.map(student => {
          const { subject1, subject2, subject3, subject4, subject5 } = student;
          const total = subject1 + subject2 + subject3 + subject4 + subject5;
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
    
    app.post('/api/students', async (req, res) => {
      try {
        const { studentName, registerNumber, subject1, subject2, subject3, subject4, subject5 } = req.body;
    
        if (!studentName || !registerNumber || subject1 === undefined) {
          return res.status(400).json({ message: 'Please provide all required fields.' });
        }
    
        const newStudent = new Student({
          studentName,
          registerNumber,
          subject1,
          subject2,
          subject3,
          subject4,
          subject5,
        });
    
        const savedStudent = await newStudent.save();
        res.status(201).json({ message: 'Student added successfully!', student: savedStudent });
    
      } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Error: Register number already exists.'});
        }
        res.status(500).json({ message: 'Error saving student data', error });
      }
    });
    
    
    // --- 7. Start the Server ---
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    