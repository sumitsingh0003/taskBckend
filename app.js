const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const moment = require("moment");
const https = require("https");
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { pool, connection } = require('./db');

const app = express();
const port = 9898;
dotenv.config(); // Load environment variables from .env
app.use(express.json());
app.use(cors());

// Create a Nodemailer transporter using Hostinger SMTP credentials
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Example: smtp.hostinger.com
  port: 587,   // Example: 587
  auth: {
    user: 'ssingh98915@gmail.com', // Your email username
    pass: 'glayedosqzaubtbj', // Your email password
  },
});

app.get('/api/tasks', async (req, res) => {
  // const {phone} = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM tasks', []);
    if (rows.length > 0) {
      res.json({ data: rows, message: 'Tasks fetched succesfully', status: 'success' });
      return;
    }
    res.status(200).json({ data: [], message: 'No Tasks found', status: 'success' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred', status: 'failure' });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  const { phone } = req.query;
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT DATE_FORMAT(scheduleTime, "%Y-%m-%dT%H:%i") AS scheduleTime, id, phone, title, description, status FROM tasks WHERE id = ?', [id]);
    if (rows.length > 0) {
      res.json({ data: rows[0], message: 'Task fetched succesfully', status: 'success' });
      return;
    }
    res.status(200).json({ data: {}, message: 'No Task found', status: 'success' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred', status: 'failure' });
  }
});

// Admin login endpoint
app.post('/api/tasks', async (req, res) => {
  const { phone, title, description, scheduleTime, recurringType, endDate } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO tasks (phone, title, description, scheduleTime, recurringType, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [phone, title, description, scheduleTime, recurringType, endDate, 'Active']);

    // Prepare the email
    const mailOptions = {
      from: 'ssingh98915@gmail.com', // Your email address
      to: 'sumit18440@gmail.com',
      subject: 'New Task Added',
      html: `<p>Hi,<br><br>A New Task added<br><b>Phone:</b> ${phone},<br> <b>Title:</b> ${title},<br> <b>Description:</b> ${description},<br> <b>ScheduleTime:</b> ${scheduleTime}</p>,<br> <b>EndTime:</b> ${endDate},<br> <b>RecurryingType:</b> ${recurringType}</p></p>`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    res.json({ message: 'New Task Added Successfully', status: 'success' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred', status: 'failure' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  console.log(req.body)
  const { phone, title, description, scheduleTime, recurringType, endDate, status } = req.body;
  const { id } = req.params;
  try {
    let Null
    await pool.query('UPDATE tasks set phone=?, title=?, description=?, scheduleTime=?, recurringType=?, endDate=?, status=? where id=?', [phone, title, description, scheduleTime, recurringType===''?Null:recurringType,endDate, status, id]);
    //  Prepare the email
     const mailOptions = {
      from: 'ssingh98915@gmail.com', // Your email address
      to: 'sumit18440@gmail.com',
      subject: 'New Task Added',
      html: `<p>Hi,<br><br>A New Task added<br><b>Phone:</b> ${phone},<br> <b>Title:</b> ${title},<br> <b>Description:</b> ${description},<br> <b>ScheduleTime:</b> ${scheduleTime}</p>,<br> <b>EndTime:</b> ${endDate},<br> <b>RecurryingType:</b> ${recurringType}</p></p>`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
    res.json({ message: 'Task Updated Successfully', status: 'success' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred', status: 'failure' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE from tasks where id=?', [id]);

    // Prepare the email
    const mailOptions = {
      from: 'info@web2rise.com', // Your email address
      to: 'web2rise@gmail.com',
      subject: 'Task Deleted',
      html: `<p>Hi,<br><br>A Task Deleted</p>`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
    res.json({ message: 'Task Deleted Successfully', status: 'success' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred', status: 'failure' });
  }
});


const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});




const sendNotification = async () => {
  try{
    let sql = `SELECT * FROM tasks WHERE scheduleTime <= NOW() AND status = 'Active' AND
    (
      (tasks.recurringType IS NULL AND TIME(scheduleTime)=TIME_FORMAT(NOW(), '%H:%i:00')) OR
    (tasks.recurringType='PER_MINUTE' AND TIME(endDate) >= TIME_FORMAT(NOW(), '%H:%i:00')) OR
    (tasks.recurringType='PER_HOUR' AND MINUTE(scheduleTime)=MINUTE(NOW()) AND TIME(endDate) >= TIME_FORMAT(NOW(), '%H:%i:00')) OR
    (tasks.recurringType='DAILY' AND TIME(scheduleTime)=TIME_FORMAT(NOW(), '%H:%i:00') AND TIME(endDate) >= TIME_FORMAT(NOW(), '%H:%i:00')) OR
    (tasks.recurringType='WEEKLY' AND TIME(scheduleTime)=TIME_FORMAT(NOW(), '%H:%i:00') AND DAYOFWEEK(scheduleTime)=DAYOFWEEK(NOW()) AND TIME(endDate) >= TIME_FORMAT(NOW(), '%H:%i:00')) OR
    (tasks.recurringType='MONTHLY' AND TIME(scheduleTime)=TIME_FORMAT(NOW(), '%H:%i:00') AND DAY(scheduleTime)=DAY(NOW()) AND TIME(endDate) >= TIME_FORMAT(NOW(), '%H:%i:00')) OR
    (tasks.recurringType='YEARLY' AND TIME(scheduleTime)=TIME_FORMAT(NOW(), '%H:%i:00') AND DAY(scheduleTime)=DAY(NOW()) AND MONTH(scheduleTime)=MONTH(NOW()) AND TIME(endDate) >= TIME_FORMAT(NOW(), '%H:%i:00'))
    );`;
      const [rows] = await pool.query(sql);
      if(rows.length>0){
          rows.forEach(async (row)=>{
              try {
                  let message=encodeURI(`Hi There,\nThis is Gentle reminder regarding following:\n\n*Task Name:* ${row.title}\n*Task Description:* ${row.description}\n\n\nRegards,\nWeb2Rise`);
                 await instance.get(`https://social.web2rise.in/api/send.php?number=91${row.phone}&type=text&message=${message}&instance_id=65B2165A5C74A&access_token=f03cd8235c4fc75ae2fb4605e0fded50`)
                    .then(async response => {
                      console.log(response.data.message);
                      if(response.data.message==='Success'){
                        // const sql = `UPDATE tasks set status = 'Inactive' WHERE id = ${row.id} AND (recurringType IS NULL OR TIME(endDate) <= TIME_FORMAT(NOW(), '%H:%i:00'))`;
                        await pool.query(`UPDATE tasks set status = 'Inactive' WHERE id = ? AND (recurringType IS NULL OR TIME(endDate) <= TIME_FORMAT(NOW(), '%H:%i:00'))`, [row.id]);
                        
                        const sql = "INSERT INTO task_log (phone, title, description) VALUES (?, ?, ?)";
                        const values = [row.phone, row.title, row.description];
                        // await pool.query(`INSERT INTO task_log (phone, title, description) VALUES (?, ?, ?)`, [row.phone, row.title, row.description]);
                        pool.query(sql, values, (error, results) => {
                          if (error) {
                            console.error("Error: " + error.message);
                          } else {
                            console.log("Success");
                          }
                        });
                      }
                    })
                    .catch(error => {
                      console.error('Error:', error);
                    });

              } catch (error) {
                  console.error('Transaction failed:', error);
              } finally {
                // await pool.commit();
              }
          })
      } else{
          console.log('No tasks found.');
      }
  }
  catch(error){
      console.log(error, '====>error');
  }
}

const interval = 60000; //every 1 Minute
setInterval(sendNotification, interval);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.get('/', (req, res) => {
  res.json({ message: 'Api is running' });
});