const questions = [
  {
    question: "Con gì có 4 chân nhưng không chạy?",
    options: ["Bàn", "Ghế", "Cửa"],
    correct: 0
  },
  {
    question: "Cái gì mà đi thì nằm, đứng thì bay?",
    options: ["Đồng hồ", "Máy bay", "Cầu thang"],
    correct: 0
  },
  {
    question: "Loại quả nào có nhiều vitamin C nhất?",
    options: ["Cam", "Táo", "Chuối"],
    correct: 0
  },
  {
    question: "Con vật nào có cổ dài nhất?",
    options: ["Hươu cao cổ", "Ngựa", "Voi"],
    correct: 0
  },
  {
    question: "Cái gì có mắt nhưng không nhìn thấy?",
    options: ["Kim mũi khâu", "Cây kim", "Bút chì"],
    correct: 0
  }
];

const jobs = [
  { name: 'Designer', payPerHour: 50000, isCommission: false },
  { name: 'Coder', payPerHour: 80000, isCommission: false },
  { name: 'Shipper', payPerHour: 30000, isCommission: true },
  { name: 'Teacher', payPerHour: 60000, isCommission: false },
  { name: 'Doctor', payPerHour: 100000, isCommission: false },
  { name: 'Chef', payPerHour: 40000, isCommission: false },
  { name: 'Driver', payPerHour: 35000, isCommission: true },
  { name: 'Writer', payPerHour: 45000, isCommission: false },
];

module.exports = {
  questions,
  jobs
};