const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (HTML, CSS, JS) from public folder
app.use(express.static('public'));

// ------------------ MongoDB Models ------------------
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  orders: [{ dish: String, details: String, date: Date }],
  requestedDishes: [{ dish: String, details: String, date: Date }],
  cart: [{ dish: String, quantity: Number }]
});

const User = mongoose.model('User', userSchema);

const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// ------------------ Routes ------------------

// GET MENU ITEMS
app.get('/menu-items', (req, res) => {
  const items = [
    { dish: "Pizza", price: 299, image: "images/pizza.jpg" },
    { dish: "Pasta", price: 249, image: "images/pasta.jpg" },
    { dish: "Noodles", price: 199, image: "images/Noodles.jpg" }
  ];
  res.json({ success: true, items });
});

// Default route → login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
    }
    res.json({ success: true, message: "Login successful", next: "/home.html" });
  } catch (err) {
    res.json({ success: false, message: "Error logging in" });
  }
});

// SIGNUP
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }
    const newUser = new User({ email, password, orders: [], requestedDishes: [], cart: [] });
    await newUser.save();
    res.json({ success: true, message: "Signup successful", next: "/menu.html" });
  } catch (err) {
    res.json({ success: false, message: "Error signing up" });
  }
});

// ADD TO CART
app.post('/add-to-cart', async (req, res) => {
  const { email, dish, quantity } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    user.cart.push({ dish, quantity });
    await user.save();

    res.json({ success: true, message: `${dish} added to cart`, next: "/cart.html" });
  } catch (err) {
    res.json({ success: false, message: "Error adding to cart" });
  }
});

// GET CART ITEMS
app.get('/cart-items', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.json({ success: false, message: "Error fetching cart items" });
  }
});

// CHECKOUT
app.post('/checkout', async (req, res) => {
  const { email, address, payment } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.cart.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    // Save cart items as orders
    user.orders.push(...user.cart.map(item => ({
      dish: item.dish,
      details: `Quantity: ${item.quantity}, Address: ${address}, Payment: ${payment}`,
      date: new Date()
    })));

    // Clear cart
    user.cart = [];
    await user.save();

    res.json({ success: true, message: "Checkout successful", next: "/payment.html" });
  } catch (err) {
    res.json({ success: false, message: "Error during checkout" });
  }
});

// REQUEST FOOD
app.post('/request-food', async (req, res) => {
  const { email, dish, details } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    user.requestedDishes.push({ dish, details, date: new Date() });
    await user.save();

    res.json({ success: true, message: "Food request saved", next: "/menu.html" });
  } catch (err) {
    res.json({ success: false, message: "Error saving request" });
  }
});

// SUBMIT FEEDBACK
app.post('/submit-feedback', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    const newFeedback = new Feedback({ name, email, message });
    await newFeedback.save();
    res.json({ success: true, message: "Feedback submitted successfully" });
  } catch (err) {
    res.json({ success: false, message: "Error saving feedback" });
  }
});

// ------------------ Server & DB ------------------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ziggy';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
