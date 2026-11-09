const db = require('better-sqlite3')('C:/Users/User/Documents/web-sekolah/data/sekolah.db');
const r = db.prepare('PRAGMA table_info(leave_requests)').all();
console.log(r.map(x=>x.name).join(','));
db.close();
