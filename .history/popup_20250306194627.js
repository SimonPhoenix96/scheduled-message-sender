<!DOCTYPE html>
<html>
<head>
  <title>Donation Link Poster</title>
  <style>
    body {
      width: 300px;
      padding: 10px;
      font-family: Arial, sans-serif;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    input, textarea {
      width: 100%;
      padding: 5px;
      box-sizing: border-box;
    }
    button {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #3367d6;
    }
    .status {
      margin-top: 10px;
      padding: 5px;
      border-radius: 4px;
    }
    .active {
      background-color: #d6f5d6;
      color: #2e7d32;
    }
    .inactive {
      background-color: #ffebee;
      color: #c62828;
    }
  </style>
</head>
<body>
  <h2>Donation Link Poster</h2>
  
  <div class="form-group">
    <label for="donationMessage">Donation Message:</label>
    <textarea id="donationMessage" rows="3" placeholder="Please support me at: https://example.com/donate"></textarea>
  </div>
  
  <div class="form-group">
    <label for="interval">Post Interval (minutes):</label>
    <input type="number" id="interval" min="1" value="15">
  </div>
  
  <div class="form-group">
    <label for="chatSelector">Chat Input Selector (advanced):</label>
    <input type="text" id="chatSelector" placeholder="Default: input[type='text']">
  </div>
  
  <button id="toggleButton">Start Posting</button>
  
  <div id="status" class="status inactive">
    Status: Inactive
  </div>
  
  <script src="popup.js"></script>
</body>
</html> 