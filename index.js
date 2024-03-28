const cron = require('node-cron');
const mongoose = require('mongoose');
const EmailTask = require('./models/EmailTask');
const EmailValidationResult = require('./models/EmailValidationResult'); // Ensure this model exists
const fs = require('fs');
const fastCsv = require('fast-csv');
const path = require('path');
const { Worker } = require('worker_threads');

const mongoDB = 'mongodb+srv://ranasonali987:xV4nlI6NojzO3S0W@cluster0.nzwn4zl.mongodb.net/nodecron?retryWrites=true&w=majority';

mongoose.connect(mongoDB, {
        dbName: "nodecron"
    })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

let currentIndex = 0;
let emailsToProcess = [];
let processingComplete = false;

const processEmail = () => {
  if (currentIndex < emailsToProcess.length) {
    const email = emailsToProcess[currentIndex];
    console.log(`[Main Thread] Processing email at index ${currentIndex}: ${email}`);
    const worker = new Worker(path.resolve(__dirname, 'helpers', 'emailValidator.js'));
    worker.postMessage(email);

    worker.on('message', async (result) => {
       console.log(`[Main Thread] Received result for email: ${result.email}`);
      console.log(`Email ${email} validation result:`, result);
      
      try {
        const validationResult = new EmailValidationResult(result);
        await validationResult.save();
        console.log(`Result for ${email} saved to database.`);
      } catch (error) {
        console.error(`Error saving result for ${email} to database:`, error);
      }
      currentIndex++;
    });

    worker.on('error', (error) => {
      console.error(`[Main Thread] Worker error for email ${email}:`, error);
      console.error(`Worker error for email ${email}:`, error);
      currentIndex++;
    });
    worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[Main Thread] Worker for email ${email} stopped with exit code ${code}`);
    } else {
      console.log(`[Main Thread] Worker for email ${email} finished successfully.`);
    }
    });
  } else if (currentIndex >= emailsToProcess.length && emailsToProcess.length > 0) {
     processingComplete = true;
    EmailTask.updateOne({ status: 'pending' }, { status: 'completed' })
      .then(() => {
        console.log('All emails have been processed and task marked as completed.');
        mongoose.disconnect();
        console.log('MongoDB disconnected, exiting application.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Error updating email task to completed:', err);
        mongoose.disconnect();
        console.log('MongoDB disconnected after error, exiting application.');
        process.exit(1);
      });
  }
};

const loadEmails = () => {
  EmailTask.findOne({ status: 'pending' }).then(task => {
    if (task) {
      const csvFilePath = path.resolve(__dirname, task.filePath);
      fs.createReadStream(csvFilePath)
        .pipe(fastCsv.parse({ headers: true }))
        .on('data', (row) => {
          emailsToProcess.push(row.Emails);
        })
        .on('end', () => {
          console.log('Emails loaded. Starting processing.');
        });
    } else {
      console.log('No pending tasks found. Exiting.');
      mongoose.disconnect();
    }
  }).catch(err => {
    console.error('Error loading emails:', err);
    mongoose.disconnect();
  });
};

cron.schedule('* * * * *', () => {
  console.log('Cron job started');
  if (!processingComplete) {
    if (emailsToProcess.length === 0) {
      console.log('Loading emails for processing...');
      loadEmails();
    } else {
      processEmail();
    }
  } else {  
    console.log('Processing complete, application will exit now.');
    this.stop();
    process.exit(0);
  }
});
