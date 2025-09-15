#!/usr/bin/env node
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const { format } = require("date-fns");
const OpenAI = require("openai");

// Initialize OpenAI with error checking
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Error: OPENAI_API_KEY not found in environment variables");
  console.log("💡 Create a .env file with: OPENAI_API_KEY=your_key_here");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Template for consistent formatting
const logTemplate = `## 📅 {date}

### ✅ Key Learnings:
{summary}

### ⌨️ Tech Touched Today:
{techs}

---`;

(async () => {
  try {
    console.log("🚀 Starting Learning Log System...\n");

    // Step 1: Get today's date info
    const today = new Date();
    const year = format(today, "yyyy");
    const month = format(today, "MMMM").toLowerCase(); // e.g., september
    const dateStr = format(today, "yyyy-MM-dd");

    console.log(`📅 Logging for: ${dateStr}`);

    // Step 2: Prepare folder/file paths
    const yearFolder = path.join(__dirname, "rupesh-logs", year);

    // Create directories if they don't exist
    if (!fs.existsSync(path.join(__dirname, "rupesh-logs"))) {
      fs.mkdirSync(path.join(__dirname, "rupesh-logs"));
    }
    if (!fs.existsSync(yearFolder)) {
      fs.mkdirSync(yearFolder, { recursive: true });
    }

    const monthFile = path.join(yearFolder, `${month}.md`);

    // Create monthly file if it doesn't exist
    if (!fs.existsSync(monthFile)) {
      const monthHeader = `# ${
        month.charAt(0).toUpperCase() + month.slice(1)
      } ${year} - Learning Log\n\n`;
      fs.writeFileSync(monthFile, monthHeader);
      console.log(`✅ Created new monthly file: ${month}.md`);
    }

    // Step 3: Get user input with better prompts
    console.log("\n📝 Please provide your learning details:\n");

    const answers = await inquirer.prompt([
      {
        type: "editor", // Use editor for multi-line input
        name: "learnings",
        message: "Enter your key learnings and technologies used today:",
        default: "What I learned:\n- \n\nTechnologies used:\n- ",
      },
      {
        type: "confirm",
        name: "shouldContinue",
        message: "Process this entry with AI?",
        default: true,
      },
    ]);

    if (!answers.shouldContinue) {
      console.log("❌ Cancelled by user");
      return;
    }

    if (!answers.learnings.trim()) {
      console.log("❌ No content provided");
      return;
    }

    // Step 4: Send input to AI for polishing
    console.log("\n🤖 Processing with AI...");

    const aiPrompt = `
You are a learning log assistant. Take the following raw learning notes and format them according to this template:

## 📅 ${dateStr}

### ✅ Key Learnings:
- (Extract and format key learnings as clear bullet points)
- (Focus on concepts, insights, and understanding gained)

### ⌨️ Tech Touched Today:
(List technologies as comma-separated values, e.g., React, Node.js, MongoDB)

Guidelines:
- Make bullet points clear and concise
- Extract specific technologies mentioned
- Enhance clarity while preserving the original meaning
- If no specific technologies are mentioned, write "General learning"

Raw notes:
${answers.learnings}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that formats learning notes into structured, clear entries.",
        },
        {
          role: "user",
          content: aiPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent formatting
    });

    const polishedEntry = response.choices[0].message.content.trim();

    // Step 5: Append to monthly file
    const entryToAdd = `\n${polishedEntry}\n\n`;
    fs.appendFileSync(monthFile, entryToAdd);

    // Step 6: Success feedback
    console.log("\n✅ Success!");
    console.log(`📁 Log saved to: ${monthFile}`);
    console.log(`📊 Entry added for: ${dateStr}`);

    // Show preview of what was added
    console.log("\n📋 Preview of added entry:");
    console.log("─".repeat(50));
    console.log(polishedEntry);
    console.log("─".repeat(50));
  } catch (error) {
    console.error("\n❌ Error occurred:");

    if (error.code === "ENOENT") {
      console.error("File/directory access error:", error.message);
    } else if (error.response?.status === 401) {
      console.error("OpenAI API authentication failed. Check your API key.");
    } else if (error.response?.status === 429) {
      console.error("OpenAI API rate limit exceeded. Try again later.");
    } else if (error.response) {
      console.error(
        "OpenAI API error:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("Unexpected error:", error.message);
    }

    console.log("\n💡 Troubleshooting:");
    console.log("1. Check your .env file has OPENAI_API_KEY");
    console.log(
      "2. Ensure you have write permissions in the current directory"
    );
    console.log("3. Verify your OpenAI API key is valid and has credits");

    process.exit(1);
  }
})();

// Export for testing
module.exports = { logTemplate };
