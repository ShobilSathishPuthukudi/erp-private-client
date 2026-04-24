import { User } from './src/models/index.js';
const users = await User.findAll({ attributes: ['uid', 'name', 'role'] });
console.log(users.map(u => ({uid: u.uid, name: u.name, role: u.role})).filter(u => u.role.toLowerCase().includes('admin')));
