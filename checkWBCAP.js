const axios = require('axios');
const pdfParse = require('pdf-parse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
  path: 'wbcap_results.csv',
  header: [
    { id: 'serial', title: 'Serial' },
    { id: 'url', title: 'URL' },
    { id: 'college', title: 'College' },
    { id: 'course', title: 'Course' },
    { id: 'status', title: 'Status' }
  ]
});

async function checkWBCAP(start, end) {
  const baseUrl = 'https://wbcap2025storage.blob.core.windows.net/public/MeritList_P1/';
  let results = [];

  for (let i = start; i <= end; i++) {
    const url = `${baseUrl}${i}_P1_A1.pdf`;
    console.log(`\n🔍 Checking: ${url}`);

    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });

      if (response.status === 200) {
        console.log(`✅ Found PDF`);

        const data = await pdfParse(response.data);
        const text = data.text;
        const lines = text.split('\n');

        // ✅ College detection — includes "College" or "Mahavidyalaya"
        const collegeLine = lines.find(line =>
          /College|Mahavidyalaya/i.test(line)
        );
        const college = collegeLine ? collegeLine.trim() : "College not found";

        // ✅ Course detection — includes 3/4-Year, B.A., B.Sc., B.Com., B.C.A., B.B.M., etc.
        const courseLine = lines.find(line =>
          /[34]\s*-\s*Year/i.test(line) ||
          /B\.(A|Sc|Com|C.A.|B.M.)/i.test(line) ||   // Matches B.A., B.Sc., B.Com., B.C.A., B.B.M.
          /Bachelor/i.test(line) ||
          /Hons/i.test(line)
        );
        const course = courseLine ? courseLine.trim() : "Course not found";

        console.log(`🏫 College: ${college}`);
        console.log(`📘 Course: ${course}`);

        results.push({
          serial: i,
          url,
          college: college,
          course: course,
          status: "Found"
        });
      } else {
        console.log(`❌ Not Found (HTTP ${response.status})`);
        results.push({
          serial: i,
          url,
          college: "",
          course: "",
          status: `HTTP ${response.status}`
        });
      }
    } catch (error) {
      console.log(`❌ Not Found or Error: ${error.message}`);
      results.push({
        serial: i,
        url,
        college: "",
        course: "",
        status: "Error or Not Found"
      });
    }
  }

  // Write results to CSV
  await csvWriter.writeRecords(results);
  console.log('\n📝 Results saved to wbcap_results.csv');
}

// Run the checker for serials 9999 to 11000
checkWBCAP(1000,4999);
