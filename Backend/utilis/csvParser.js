// utilis/csvParser.js - CARD-AGENT
const csv = require('csv-parser');
const stream = require('stream');

/**
 * Parse CSV buffer into student/employee objects
 * @param {Buffer} csvBuffer - CSV file buffer
 * @returns {Promise<Array>} Array of person objects
 */
async function parseCSVFromBuffer(csvBuffer) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📊 Starting CSV parsing...');

      const people = [];
      let rowCount = 0;

      const bufferStream = new stream.PassThrough();
      bufferStream.end(csvBuffer);

      bufferStream
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;

          const findValue = (patterns, defaultValue = '') => {
            const rowKeys = Object.keys(row);
            for (const pattern of patterns) {
              for (const key of rowKeys) {
                if (key.toLowerCase().includes(pattern.toLowerCase())) {
                  const value = row[key];
                  if (value && value.toString().trim() !== '') {
                    return value.toString().trim();
                  }
                }
              }
            }
            return defaultValue;
          };

          // Detect person type
          const hasEmployeeFields = Object.keys(row).some(k =>
            k.toLowerCase().includes('department') ||
            k.toLowerCase().includes('position') ||
            k.toLowerCase().includes('employee')
          );

          const person = {
            student_id: (() => {
              const rowKeys = Object.keys(row);
              for (const key of rowKeys) {
                const keyLower = key.toLowerCase();
                if ((keyLower.includes('student') && keyLower.includes('id')) ||
                  keyLower === 'id' || keyLower === 'studentid' || keyLower === 'employeeid') {
                  const value = row[key];
                  if (value && value.toString().trim() !== '') {
                    return value.toString().trim();
                  }
                }
              }
              return `PER${rowCount.toString().padStart(3, '0')}`;
            })(),

            name: findValue(['name', 'fullname', 'studentname', 'employeename'], 'Unknown'),
            personType: hasEmployeeFields ? 'employee' : 'student',

            // Student fields
            studentDetails: {
              class: findValue(['class', 'grade', 'form'], 'N/A'),
              level: findValue(['level', 'education', 'olevel', 'alevel'], 'N/A'),
              academic_year: findValue(['academic', 'year', 'session'], new Date().getFullYear().toString()),
              parent_phone: findValue(['parent', 'phone', 'parentphone'], '')
            },

            // Employee fields
            employeeDetails: {
              department: findValue(['department', 'dept'], ''),
              position: findValue(['position', 'title', 'job'], ''),
              employeeId: findValue(['employeeid', 'employee_id', 'empid'], ''),
              workPhone: findValue(['workphone', 'work_phone', 'office'], '')
            },

            gender: findValue(['gender', 'sex'], 'N/A'),
            residence: findValue(['residence', 'address', 'location', 'city'], 'N/A'),

            imported_via_csv: true,
            csv_import_timestamp: new Date()
          };

          people.push(person);
        })
        .on('end', () => {
          console.log(`✅ Parsed ${people.length} records from CSV (${people.filter(p => p.personType === 'student').length} students, ${people.filter(p => p.personType === 'employee').length} employees)`);
          resolve(people);
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });

    } catch (error) {
      reject(new Error(`CSV parsing failed: ${error.message}`));
    }
  });
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

module.exports = {
  parseCSVFromBuffer,
  parseCSVLine
};