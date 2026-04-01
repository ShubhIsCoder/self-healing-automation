const fs = require('fs').promises;
const path = require('path');

async function generateMarkdownReport(jsonPath) {
  const outputPath = path.join(process.cwd(), 'AUDIT_REPORT.md');
  
  try {
    const data = await fs.readFile(jsonPath, 'utf8');
    const reports = JSON.parse(data);

    let markdown = '# 🔥 Shadow Auditor: Test Flakiness Report\n\n';
    markdown += `*Generated on: ${new Date().toLocaleString()}*\n\n`;
    markdown += '---\n\n';

    if (reports.length === 0) {
      markdown += '## ✅ No issues found. Your tests are bulletproof!\n';
    } else {
      markdown += `## 🛠 Detected ${reports.length} Potential Test Failures\n\n`;
      markdown += '| Failed Selector | Reason | Suggested Healed Selector | Confidence Score | Timestamp |\n';
      markdown += '| :--- | :--- | :--- | :--- | :--- |\n';

      reports.forEach(report => {
        const confidence = (report.confidenceScore * 100).toFixed(0) + '%';
        markdown += `| \`${report.failedSelector}\` | ${report.reason} | \`${report.suggestedHealedSelector}\` | **${confidence}** | ${report.timestamp} |\n`;
      });

      markdown += '\n---\n\n';
      markdown += '### 💡 Recommendations\n';
      markdown += '- Consider updating the failed selectors with the suggested healed selectors for improved reliability.\n';
      markdown += '- Use the **Discovery Engine** in your tests to dynamically heal such failures in real-time.\n';
    }

    await fs.writeFile(outputPath, markdown);
    console.log(`Markdown report generated at ${outputPath}`);

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No REPORT.json found. Nothing to generate.');
    } else {
      console.error('Error generating report:', error);
    }
  }
}

if (require.main === module) {
  const reportFile = process.argv[2] || 'REPORT.json';
  generateMarkdownReport(reportFile);
}

module.exports = { generateMarkdownReport };
