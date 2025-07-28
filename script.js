;(() => {
  // Wrap everything in a try-catch to prevent any uncaught errors
  try {
    // --- Global Variables ---
    let isOnline = false
    let syncQueue = []
    let billiardRows = []
    let groceryRows = []
    let expenseRows = []
    let groceryRecallTableNames = []
    let groceryRecallItems = []
    let currentEditingExpenseRow = null
    let isFirebaseSyncPaused = false // Prevent sync loops
    let lastSaveTimestamp = 0 // Prevent duplicate saves
    let isInitialLoad = true // Track if this is the first load
    let shiftStartTime = null // Track shift start time

    // Firebase variables - will be initialized later
    let database = null
    let storage = null
    let firebaseInitialized = false

    // Enhanced Calculator variables
    let calculatorExpression = ""
    let calculatorResult = "0"

    // --- Authentication System ---
    const VALID_USERNAME = "popseyadmin"
    const VALID_PASSWORD = "bnrpopsey0308"
    const LOGIN_SESSION_KEY = "popsey_login_session"
    const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

    function checkLoginStatus() {
      try {
        const loginSession = localStorage.getItem(LOGIN_SESSION_KEY)
        if (loginSession) {
          const sessionData = JSON.parse(loginSession)
          const currentTime = Date.now()
          // Check if session is still valid (within 24 hours)
          if (currentTime - sessionData.timestamp < SESSION_DURATION) {
            showMainDashboard()
            return true
          } else {
            // Session expired, remove it
            localStorage.removeItem(LOGIN_SESSION_KEY)
          }
        }
        showLoginScreen()
        return false
      } catch (error) {
        console.error("Error checking login status:", error)
        showLoginScreen()
        return false
      }
    }

    function showLoginScreen() {
      try {
        const loginScreen = document.getElementById("loginScreen")
        const mainDashboard = document.getElementById("mainDashboard")
        if (loginScreen) loginScreen.style.display = "flex"
        if (mainDashboard) mainDashboard.style.display = "none"
      } catch (error) {
        console.error("Error showing login screen:", error)
      }
    }

    function showMainDashboard() {
      try {
        const loginScreen = document.getElementById("loginScreen")
        const mainDashboard = document.getElementById("mainDashboard")
        if (loginScreen) loginScreen.style.display = "none"
        if (mainDashboard) mainDashboard.style.display = "block"
      } catch (error) {
        console.error("Error showing main dashboard:", error)
      }
    }

    function handleLogin(event) {
      try {
        event.preventDefault()
        const username = document.getElementById("username").value.trim()
        const password = document.getElementById("password").value
        const errorDiv = document.getElementById("loginError")

        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
          // Save login session
          const sessionData = {
            username: username,
            timestamp: Date.now(),
          }
          localStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify(sessionData))

          // Hide error and show dashboard
          if (errorDiv) errorDiv.style.display = "none"
          showMainDashboard()

          // Initialize the main application after showing dashboard
          setTimeout(() => {
            initializePage()
          }, 100)

          console.log("Login successful")
        } else {
          // Show error message
          if (errorDiv) {
            errorDiv.textContent = "Invalid username or password. Please try again."
            errorDiv.style.display = "block"
          }
          // Clear password field
          document.getElementById("password").value = ""
          console.log("Login failed")
        }
      } catch (error) {
        console.error("Error handling login:", error)
      }
    }

    function handleLogout() {
      try {
        if (confirm("Are you sure you want to logout?")) {
          // Remove login session
          localStorage.removeItem(LOGIN_SESSION_KEY)
          // Show login screen
          showLoginScreen()
          // Clear form fields
          document.getElementById("username").value = ""
          document.getElementById("password").value = ""
          console.log("Logout successful")
        }
      } catch (error) {
        console.error("Error handling logout:", error)
      }
    }

    function setupAuthenticationListeners() {
      try {
        // Login form submission
        const loginForm = document.getElementById("loginForm")
        if (loginForm) {
          loginForm.addEventListener("submit", handleLogin)
        }

        // Logout button
        const logoutBtn = document.getElementById("logoutBtn")
        if (logoutBtn) {
          logoutBtn.addEventListener("click", handleLogout)
        }

        // Enter key on password field
        const passwordField = document.getElementById("password")
        if (passwordField) {
          passwordField.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
              handleLogin(e)
            }
          })
        }
      } catch (error) {
        console.error("Error setting up authentication listeners:", error)
      }
    }

    // --- Enhanced Calculator Functions ---
    function toggleCalculator() {
      try {
        const sidebar = document.getElementById("calculatorSidebar")
        const btn = document.getElementById("calculatorBtn")

        if (sidebar.classList.contains("open")) {
          sidebar.classList.remove("open")
          btn.classList.remove("active")
        } else {
          sidebar.classList.add("open")
          btn.classList.add("active")
        }
      } catch (error) {
        console.error("Error toggling calculator:", error)
      }
    }

    function closeCalculator() {
      try {
        const sidebar = document.getElementById("calculatorSidebar")
        const btn = document.getElementById("calculatorBtn")
        sidebar.classList.remove("open")
        btn.classList.remove("active")
      } catch (error) {
        console.error("Error closing calculator:", error)
      }
    }

    function updateCalculatorDisplays() {
      try {
        const expressionDisplay = document.getElementById("calculatorExpression")
        const resultDisplay = document.getElementById("calculatorResult")

        if (expressionDisplay) {
          expressionDisplay.value = calculatorExpression || ""
        }

        if (resultDisplay) {
          resultDisplay.value = calculatorResult
        }
      } catch (error) {
        console.error("Error updating calculator displays:", error)
      }
    }

    function evaluateExpression(expression) {
      try {
        if (!expression || expression.trim() === "") {
          return "0"
        }

        // Replace display symbols with JavaScript operators
        const jsExpression = expression.replace(/×/g, "*").replace(/÷/g, "/")

        // Basic validation - only allow numbers, operators, and decimal points
        if (!/^[0-9+\-*/.() ]+$/.test(jsExpression)) {
          return "Error"
        }

        // Evaluate the expression safely
        const result = Function('"use strict"; return (' + jsExpression + ")")()

        if (isNaN(result) || !isFinite(result)) {
          return "Error"
        }

        return result.toString()
      } catch (error) {
        return "Error"
      }
    }

    function clearCalculator() {
      try {
        calculatorExpression = ""
        calculatorResult = "0"
        updateCalculatorDisplays()
      } catch (error) {
        console.error("Error clearing calculator:", error)
      }
    }

    function deleteLast() {
      try {
        if (calculatorExpression.length > 0) {
          calculatorExpression = calculatorExpression.slice(0, -1)
          calculatorResult = evaluateExpression(calculatorExpression)
          updateCalculatorDisplays()
        }
      } catch (error) {
        console.error("Error deleting last character:", error)
      }
    }

    function appendToCalculator(value) {
      try {
        // Handle operators
        if (["+", "-", "*", "/", "×", "÷"].includes(value)) {
          // Convert display symbols to standard symbols for internal storage
          const standardValue = value === "×" ? "*" : value === "÷" ? "/" : value

          // Don't allow consecutive operators
          const lastChar = calculatorExpression.slice(-1)
          if (["+", "-", "*", "/"].includes(lastChar)) {
            // Replace the last operator
            calculatorExpression = calculatorExpression.slice(0, -1) + standardValue
          } else if (calculatorExpression !== "") {
            calculatorExpression += standardValue
          }
        } else {
          // Handle numbers and decimal points
          calculatorExpression += value
        }

        // Update result in real-time
        calculatorResult = evaluateExpression(calculatorExpression)
        updateCalculatorDisplays()
      } catch (error) {
        console.error("Error appending to calculator:", error)
      }
    }

    function calculateResult() {
      try {
        if (calculatorExpression !== "") {
          calculatorResult = evaluateExpression(calculatorExpression)
          calculatorExpression = calculatorResult
          updateCalculatorDisplays()
        }
      } catch (error) {
        console.error("Error calculating result:", error)
      }
    }

    // Make calculator functions global for onclick handlers
    window.clearCalculator = clearCalculator
    window.deleteLast = deleteLast
    window.appendToCalculator = appendToCalculator
    window.calculateResult = calculateResult

    // --- Shift Management Functions ---
    function handleStartShift() {
      try {
        if (shiftStartTime) {
          alert("Shift has already been started!")
          return
        }

        const now = new Date()
        shiftStartTime = now.toLocaleString()

        // Save to localStorage
        localStorage.setItem("popsey_shift_start_time", shiftStartTime)

        // Update display
        updateShiftStartDisplay()

        // Save to Firebase
        if (!isInitialLoad && !isFirebaseSyncPaused) {
          triggerAutoSave("shift_start", true)
        }

        alert(`Shift started at ${shiftStartTime}`)
      } catch (error) {
        console.error("Error starting shift:", error)
      }
    }

    function updateShiftStartDisplay() {
      try {
        const display = document.getElementById("shiftStartDisplay")
        if (display) {
          if (shiftStartTime) {
            display.textContent = `Shift Started: ${shiftStartTime}`
            display.style.color = "#28a745"
          } else {
            display.textContent = "Shift Status: Not Started"
            display.style.color = "#dc3545"
          }
        }
      } catch (error) {
        console.error("Error updating shift start display:", error)
      }
    }

    function loadShiftStartTime() {
      try {
        const savedTime = localStorage.getItem("popsey_shift_start_time")
        if (savedTime) {
          shiftStartTime = savedTime
          updateShiftStartDisplay()
        }
      } catch (error) {
        console.error("Error loading shift start time:", error)
      }
    }

    // --- Table Total Display Functions ---
    function updateBilliardTotal() {
      try {
        let visibleTotal = 0
        const billiardRows = document.querySelectorAll("#billiardTbody tr")

        billiardRows.forEach((row) => {
          if (row.style.display !== "none") {
            const paidElement = row.querySelector(".paid-value")
            if (paidElement) {
              const paid = Number.parseFloat(paidElement.textContent) || 0
              visibleTotal += paid
            }
          }
        })

        const totalDisplay = document.getElementById("billiardVisibleTotal")
        if (totalDisplay) {
          totalDisplay.textContent = visibleTotal.toFixed(2)
        }
      } catch (error) {
        console.error("Error updating billiard total:", error)
      }
    }

    function updateGroceryTotal() {
      try {
        let visibleTotal = 0
        const groceryRows = document.querySelectorAll("#groceryTbody tr")

        groceryRows.forEach((row) => {
          if (row.style.display !== "none") {
            const totalElement = row.querySelector(".grocery-total")
            if (totalElement) {
              const total = Number.parseFloat(totalElement.textContent) || 0
              visibleTotal += total
            }
          }
        })

        const totalDisplay = document.getElementById("groceryVisibleTotal")
        if (totalDisplay) {
          totalDisplay.textContent = visibleTotal.toFixed(2)
        }
      } catch (error) {
        console.error("Error updating grocery total:", error)
      }
    }

    // Check online status safely
    try {
      isOnline = navigator.onLine
    } catch (e) {
      isOnline = false
    }

    // Function to safely initialize Firebase
    function initializeFirebase() {
      try {
        // Check if Firebase is available in the global scope
        if (
          typeof window !== "undefined" &&
          window.firebase &&
          window.firebase.apps &&
          window.firebase.apps.length > 0
        ) {
          database = window.firebase.database()
          storage = window.firebase.storage()
          firebaseInitialized = true
          console.log("Firebase initialized successfully")
        } else {
          console.log("Firebase not available - running in offline mode")
        }
      } catch (error) {
        console.log("Firebase initialization failed - running in offline mode:", error)
      }
    }

    // --- ENHANCED: Real-time Auto-Save System ---
    let saveTimeout = null
    function triggerAutoSave(action = "data_change", immediate = false) {
      try {
        if (immediate) {
          // For critical actions, save immediately
          updateSyncStatus("syncing")
          updateDashboardValues()
          updateLastSaveTime()
          console.log(`Immediate save: ${action}`)
          return
        }

        // Clear existing timeout to debounce saves
        if (saveTimeout) {
          clearTimeout(saveTimeout)
        }

        // Debounce saves to prevent rapid Firebase calls
        saveTimeout = setTimeout(() => {
          updateSyncStatus("syncing")
          updateDashboardValues()
          updateLastSaveTime()
          console.log(`Auto-saved: ${action}`)
        }, 300) // Reduced debounce time for faster sync
      } catch (error) {
        console.error("Error in triggerAutoSave:", error)
        updateSyncStatus("error")
      }
    }

    function updateLastSaveTime() {
      try {
        const now = new Date()
        const timeString = now.toLocaleTimeString()
        const lastSaveEl = document.getElementById("last-save")
        if (lastSaveEl) {
          lastSaveEl.textContent = `Last saved: ${timeString}`
        }
      } catch (error) {
        console.error("Error updating last save time:", error)
      }
    }

    // --- FIXED: Create completely clean data without circular references ---
    function createFirebaseSafeData() {
      try {
        const currentTime = Date.now()

        // Collect only the essential data needed, no DOM references
        const billiardData = []
        document.querySelectorAll("#billiardTbody tr").forEach((tr) => {
          try {
            const name = tr.querySelector(".name")?.value || ""
            const tableType = tr.querySelector(".tableType")?.value || "m8"
            const amount = Number.parseFloat(tr.querySelector(".amount")?.value) || 0
            const games = Number.parseInt(tr.querySelector(".games-value")?.textContent) || 0
            const paid = Number.parseFloat(tr.querySelector(".paid-value")?.textContent) || 0
            const total = Number.parseFloat(tr.querySelector(".total")?.textContent) || 0
            const balance = Number.parseFloat(tr.querySelector(".balance")?.textContent) || 0
            const status = tr.querySelector(".status")?.textContent || "Unpaid"
            const isActive = tr._isActive !== false
            const mode = tr.querySelector(".mode-btn")?.dataset.mode || "mesada"
            const paidHistory = Array.isArray(tr._paidHistory) ? [...tr._paidHistory] : []

            billiardData.push({
              name,
              tableType,
              amount,
              games,
              paid,
              total,
              balance,
              status,
              isActive,
              mode,
              paidHistory,
            })
          } catch (error) {
            console.error("Error collecting billiard row data:", error)
          }
        })

        const groceryData = []
        document.querySelectorAll("#groceryTbody tr").forEach((tr) => {
          try {
            const tableName = tr.querySelector(".grocery-table")?.value || ""
            const item = tr.querySelector(".grocery-item")?.value || ""
            const amount = Number.parseFloat(tr.querySelector(".grocery-amount")?.value) || 0
            const purchases = Number.parseInt(tr.querySelector(".grocery-purchases-value")?.textContent) || 0
            const totalItems = Number.parseInt(tr.querySelector(".grocery-total-items")?.textContent) || 0
            const total = Number.parseFloat(tr.querySelector(".grocery-total")?.textContent) || 0
            const status = tr._status || "Unpaid"

            groceryData.push({
              tableName,
              item,
              amount,
              purchases,
              totalItems,
              total,
              status,
            })
          } catch (error) {
            console.error("Error collecting grocery row data:", error)
          }
        })

        const expenseData = []
        document.querySelectorAll("#expenseTbody tr").forEach((tr) => {
          try {
            if (tr._expenseData) {
              expenseData.push({
                expense: tr._expenseData.expense,
                amount: tr._expenseData.amount,
              })
            }
          } catch (error) {
            console.error("Error collecting expense row data:", error)
          }
        })

        // Calculate totals safely
        const billiardPaid = billiardData.reduce((sum, row) => sum + (row.paid || 0), 0)
        const groceryTotal = groceryData.reduce((sum, row) => sum + (row.total || 0), 0)
        const expenseTotal = expenseData.reduce((sum, row) => sum + (row.amount || 0), 0)
        const combinedTotal = billiardPaid + groceryTotal

        return {
          timestamp: currentTime,
          date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
          shiftStartTime: shiftStartTime,
          billiardPaid,
          groceryTotal,
          expenseTotal,
          combinedTotal,
          billiardRows: billiardData,
          groceryRows: groceryData,
          expenseRows: expenseData,
          billiardRowsCount: billiardData.length,
          groceryRowsCount: groceryData.length,
          expenseRowsCount: expenseData.length,
          recallData: {
            tableNames: [...groceryRecallTableNames],
            items: [...groceryRecallItems],
          },
        }
      } catch (error) {
        console.error("Error creating Firebase safe data:", error)
        return {
          timestamp: Date.now(),
          date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
          shiftStartTime: shiftStartTime,
          billiardPaid: 0,
          groceryTotal: 0,
          expenseTotal: 0,
          combinedTotal: 0,
          billiardRows: [],
          groceryRows: [],
          expenseRows: [],
          billiardRowsCount: 0,
          groceryRowsCount: 0,
          expenseRowsCount: 0,
          recallData: { tableNames: [], items: [] },
        }
      }
    }

    function saveCompleteState() {
      try {
        const completeState = createFirebaseSafeData()

        // Save locally immediately
        try {
          localStorage.setItem("popsey_complete_state", JSON.stringify(completeState))
          console.log(
            `State saved locally: ${completeState.billiardRowsCount} billiard rows, ${completeState.groceryRowsCount} grocery rows, ${completeState.expenseRowsCount} expense rows`,
          )
        } catch (error) {
          console.error("Error saving to localStorage:", error)
        }

        // Save to Firebase with protection against loops
        if (!isFirebaseSyncPaused && completeState.timestamp > lastSaveTimestamp) {
          lastSaveTimestamp = completeState.timestamp
          saveToFirebaseRealtime("complete_state", completeState)
        }

        return completeState
      } catch (error) {
        console.error("Error in saveCompleteState:", error)
        return null
      }
    }

    function loadCompleteState() {
      try {
        const savedState = localStorage.getItem("popsey_complete_state")
        if (savedState) {
          const state = JSON.parse(savedState)
          console.log(
            `Loading saved state: ${state.billiardRowsCount || 0} billiard rows, ${state.groceryRowsCount || 0} grocery rows, ${state.expenseRowsCount || 0} expense rows`,
          )

          // Load shift start time
          if (state.shiftStartTime) {
            shiftStartTime = state.shiftStartTime
            updateShiftStartDisplay()
          }

          // Clear existing tables first
          clearAllTables()

          // Restore billiard rows ONLY if there are saved rows
          if (state.billiardRows && state.billiardRows.length > 0) {
            state.billiardRows.forEach((rowData) => {
              const tr = createBilliardRowFromData(rowData)
              const tbody = document.getElementById("billiardTbody")
              if (tbody && tr) {
                tbody.appendChild(tr)
                billiardRows.push(tr)
              }
            })
          }

          // Restore grocery rows ONLY if there are saved rows
          if (state.groceryRows && state.groceryRows.length > 0) {
            state.groceryRows.forEach((rowData) => {
              const tr = createGroceryRowFromData(rowData)
              const tbody = document.getElementById("groceryTbody")
              if (tbody && tr) {
                tbody.appendChild(tr)
                groceryRows.push(tr)
              }
            })
          }

          // Restore expense rows
          if (state.expenseRows && state.expenseRows.length > 0) {
            state.expenseRows.forEach((rowData) => {
              const tr = createExpenseRowFromData(rowData)
              const tbody = document.getElementById("expenseTbody")
              if (tbody && tr) {
                tbody.appendChild(tr)
                expenseRows.push(tr)
              }
            })
          }

          // Restore recall data
          if (state.recallData) {
            groceryRecallTableNames = state.recallData.tableNames || []
            groceryRecallItems = state.recallData.items || []
          }

          // Update dashboard and totals
          updateDashboardValues()
          updateBilliardTotal()
          updateGroceryTotal()
          filterBilliardRows()
          console.log(
            `Data loaded successfully: ${billiardRows.length} billiard rows, ${groceryRows.length} grocery rows, ${expenseRows.length} expense rows`,
          )
          return true
        }
      } catch (error) {
        console.error("Error loading saved state:", error)
      }
      return false
    }

    // New function to clear all tables without adding default rows
    function clearAllTables() {
      try {
        // Clear existing tables
        document.querySelectorAll("#billiardTbody tr").forEach((tr) => tr.remove())
        document.querySelectorAll("#groceryTbody tr").forEach((tr) => tr.remove())
        document.querySelectorAll("#expenseTbody tr").forEach((tr) => tr.remove())

        // Reset arrays
        billiardRows = []
        groceryRows = []
        expenseRows = []

        console.log("All tables cleared")
      } catch (error) {
        console.error("Error clearing tables:", error)
      }
    }

    function createBilliardRowFromData(data) {
      try {
        const tr = document.createElement("tr")
        tr.innerHTML = `
          <td>
            <button class="active-switch-btn" data-active="${data.isActive}">${data.isActive ? "Active" : "Done"}</button>
          </td>
          <td class="status ${data.status === "Paid" ? "status-paid" : "status-unpaid"}">${data.status}</td>
          <td>
            <select class="tableType">
              <option value="m8" ${data.tableType === "m8" ? "selected" : ""}>M8</option>
              <option value="m7" ${data.tableType === "m7" ? "selected" : ""}>M7</option>
              <option value="alpha" ${data.tableType === "alpha" ? "selected" : ""}>Alpha</option>
              <option value="regal" ${data.tableType === "regal" ? "selected" : ""}>Regal</option>
            </select>
            <button class="mode-btn ${data.mode === "hour" ? "active" : ""}" data-mode="${data.mode}">${data.mode.charAt(0).toUpperCase() + data.mode.slice(1)}</button>
          </td>
          <td><input type="number" class="amount" value="${data.amount}" readonly></td>
          <td>
            <span class="games-value">${data.games}</span>
            <div class="games-tally" style="display:inline-block;vertical-align:middle;"></div>
            <button class="add-game-btn">Add</button>
            <button class="delete-game-btn">Delete</button>
          </td>
          <td class="total">${data.total}</td>
          <td>
            <span class="paid-value">${data.paid}</span>
            <input type="number" class="paid-input" value="0" min="0" style="width:60px;">
            <button class="add-paid-btn">Add</button>
            <div class="paid-history"></div>
          </td>
          <td class="totalPaid">${data.paid}</td>
          <td class="balance">${data.balance}</td>
          <td>
            <input type="text" class="name" value="${data.name}">
            <button class="delete-row-btn" title="Delete Row">Delete</button>
          </td>
        `

        // Restore paid history
        tr._paidHistory = Array.isArray(data.paidHistory) ? [...data.paidHistory] : []
        tr._isActive = data.isActive
        attachBilliardRowEvents(tr)
        updateBilliardRow(tr)
        return tr
      } catch (error) {
        console.error("Error creating billiard row from data:", error)
        return null
      }
    }

    function createGroceryRowFromData(data) {
      try {
        const tr = document.createElement("tr")
        // Create status cell content based on table name and status
        let statusContent = ""
        if (!data.tableName || data.tableName.trim() === "") {
          statusContent = '<span class="grocery-status grocery-purchase">Purchase</span>'
        } else {
          const statusClass = data.status === "Paid" ? "paid" : "unpaid"
          statusContent = `<button class="grocery-status-btn ${statusClass}" data-status="${data.status}">${data.status}</button>`
        }

        tr.innerHTML = `
          <td class="grocery-status-cell">${statusContent}</td>
          <td><input type="text" class="grocery-table" value="${data.tableName}"></td>
          <td><input type="text" class="grocery-item" value="${data.item}"></td>
          <td><input type="number" class="grocery-amount" value="${data.amount}"></td>
          <td>
            <span class="grocery-purchases-value">${data.purchases}</span>
            <input type="number" class="grocery-purchases-input" value="1" min="1" style="width:50px;">
            <button class="grocery-add-purchase-btn">Add</button>
            <button class="grocery-delete-purchase-btn">Delete</button>
          </td>
          <td class="grocery-total-items">${data.totalItems}</td>
          <td class="grocery-total">${data.total}</td>
          <td>
            <button class="grocery-delete-row-btn" title="Delete Row">Delete</button>
          </td>
        `

        // Restore purchases
        tr._purchases = data.purchases
        tr._status = data.status || "Unpaid"
        attachGroceryRowEvents(tr)
        updateGroceryRow(tr)
        return tr
      } catch (error) {
        console.error("Error creating grocery row from data:", error)
        return null
      }
    }

    function createExpenseRowFromData(data) {
      try {
        const tr = document.createElement("tr")
        tr.innerHTML = `
          <td class="expense-name">${data.expense}</td>
          <td class="expense-amount">₱${data.amount.toFixed(2)}</td>
          <td>
            <button class="expense-edit-btn">Edit</button>
            <button class="expense-delete-btn">Delete</button>
          </td>
        `

        // Store data on the row
        tr._expenseData = {
          expense: data.expense,
          amount: data.amount,
        }
        attachExpenseRowEvents(tr)
        return tr
      } catch (error) {
        console.error("Error creating expense row from data:", error)
        return null
      }
    }

    // --- Firebase & Connectivity Management ---
    function updateConnectionStatus() {
      try {
        const statusElement = document.getElementById("connection-status")
        const syncElement = document.getElementById("sync-status")
        if (!statusElement || !syncElement) return // Safety check

        if (isOnline) {
          statusElement.innerHTML = "🟢 Online"
          statusElement.style.color = "#43cea2"
          processSyncQueue()
        } else {
          statusElement.innerHTML = "🔴 Offline"
          statusElement.style.color = "#dc3545"
          syncElement.innerHTML = "⏳ Pending sync"
          syncElement.style.color = "#ffc107"
        }
      } catch (error) {
        console.error("Error updating connection status:", error)
      }
    }

    // Safe event listeners for online/offline
    try {
      window.addEventListener("online", () => {
        isOnline = true
        updateConnectionStatus()
      })
      window.addEventListener("offline", () => {
        isOnline = false
        updateConnectionStatus()
      })
    } catch (error) {
      console.error("Error setting up online/offline listeners:", error)
    }

    function addToSyncQueue(action, data) {
      try {
        syncQueue.push({ action, data, timestamp: Date.now() })
        localStorage.setItem("popsey_sync_queue", JSON.stringify(syncQueue))
      } catch (error) {
        console.error("Error adding to sync queue:", error)
      }
    }

    function processSyncQueue() {
      try {
        if (!isOnline || syncQueue.length === 0) return

        const syncElement = document.getElementById("sync-status")
        if (syncElement) {
          syncElement.innerHTML = "🔄 Syncing..."
          syncElement.style.color = "#ffc107"
        }

        syncQueue.forEach((item) => {
          switch (item.action) {
            case "save_current":
              saveToFirebase("current_shift", item.data)
              break
            case "save_complete_state":
              saveToFirebase("complete_state", item.data)
              break
            case "save_history":
              saveHistoryToFirebase(item.data)
              break
            case "upload_file":
              uploadFileToFirebase(item.data.filename, item.data.content)
              break
          }
        })

        syncQueue = []
        localStorage.removeItem("popsey_sync_queue")

        setTimeout(() => {
          if (syncElement) {
            syncElement.innerHTML = "✓ Synced"
            syncElement.style.color = "#43cea2"
          }
        }, 1000)
      } catch (error) {
        console.error("Error processing sync queue:", error)
      }
    }

    function saveToFirebase(path, data) {
      try {
        if (isOnline && firebaseInitialized && database) {
          database
            .ref(`popsey/${path}`)
            .set(data)
            .then(() => console.log(`Data saved to Firebase: ${path}`))
            .catch((error) => console.error("Firebase save error:", error))
        } else if (!firebaseInitialized) {
          console.log("Firebase not available - data saved locally only")
        } else {
          addToSyncQueue("save_complete_state", data)
        }
      } catch (error) {
        console.error("Error in saveToFirebase:", error)
      }
    }

    // --- ENHANCED: Shift History Firebase Sync ---
    function saveHistoryToFirebase(historyItem) {
      try {
        if (isOnline && firebaseInitialized && database) {
          // Save individual history item with unique key
          database
            .ref(`popsey/shift_history/${historyItem.id}`)
            .set(historyItem)
            .then(() => {
              console.log("History saved to Firebase:", historyItem.id)
              updateSyncStatus("synced")
            })
            .catch((error) => {
              console.error("Firebase history save error:", error)
              updateSyncStatus("error")
            })
        } else if (!firebaseInitialized) {
          console.log("Firebase not available - history saved locally only")
          updateSyncStatus("offline")
        } else {
          addToSyncQueue("save_history", historyItem)
          updateSyncStatus("pending")
        }
      } catch (error) {
        console.error("Error in saveHistoryToFirebase:", error)
        updateSyncStatus("error")
      }
    }

    // --- NEW: Load Shift History from Firebase ---
    function loadShiftHistoryFromFirebase() {
      try {
        if (!firebaseInitialized || !database) return

        console.log("Loading shift history from Firebase...")
        database.ref("popsey/shift_history").once("value", (snapshot) => {
          try {
            const firebaseHistory = snapshot.val()
            if (firebaseHistory) {
              // Convert Firebase object to array
              const historyArray = Object.values(firebaseHistory)

              // Get local history
              let localHistory = []
              try {
                localHistory = JSON.parse(localStorage.getItem("popsey_shift_history")) || []
              } catch {}

              // Merge histories (Firebase takes precedence)
              const mergedHistory = [...historyArray]

              // Add any local items that aren't in Firebase
              localHistory.forEach((localItem) => {
                if (!historyArray.find((fbItem) => fbItem.id === localItem.id)) {
                  mergedHistory.push(localItem)
                  // Also save this local item to Firebase
                  saveHistoryToFirebase(localItem)
                }
              })

              // Save merged history locally
              localStorage.setItem("popsey_shift_history", JSON.stringify(mergedHistory))

              // Reload the history table
              loadShiftHistoryTable()

              console.log(`Loaded ${historyArray.length} history items from Firebase`)
            }
          } catch (error) {
            console.error("Error processing Firebase history:", error)
          }
        })
      } catch (error) {
        console.error("Error loading shift history from Firebase:", error)
      }
    }

    function uploadFileToFirebase(filename, content) {
      try {
        if (isOnline && firebaseInitialized && storage) {
          const storageRef = storage.ref(`exports/${filename}`)
          const blob = new Blob([content], { type: "application/pdf" })
          storageRef
            .put(blob)
            .then(() => console.log(`File uploaded: ${filename}`))
            .catch((error) => console.error("Firebase upload error:", error))
        } else if (!firebaseInitialized) {
          console.log("Firebase storage not available - file not uploaded")
        } else {
          addToSyncQueue("upload_file", { filename, content })
        }
      } catch (error) {
        console.error("Error in uploadFileToFirebase:", error)
      }
    }

    // --- ENHANCED: Firebase Real-time Save Function ---
    function saveToFirebaseRealtime(path, data) {
      try {
        if (!isOnline || !firebaseInitialized || !database || isFirebaseSyncPaused) {
          if (!firebaseInitialized) {
            updateSyncStatus("offline")
          } else {
            addToSyncQueue("save_complete_state", data)
            updateSyncStatus("pending")
          }
          return
        }

        // Prevent loops by pausing sync temporarily
        isFirebaseSyncPaused = true

        database
          .ref(`popsey/${path}`)
          .set(data)
          .then(() => {
            console.log(`Real-time data saved to Firebase: ${path}`)
            updateSyncStatus("synced")

            // Re-enable sync after a shorter delay for faster real-time updates
            setTimeout(() => {
              isFirebaseSyncPaused = false
            }, 500) // Reduced from 1000ms for faster delete sync
          })
          .catch((error) => {
            console.error("Firebase real-time save error:", error)
            updateSyncStatus("error")
            isFirebaseSyncPaused = false
          })
      } catch (error) {
        console.error("Error in saveToFirebaseRealtime:", error)
        updateSyncStatus("error")
        isFirebaseSyncPaused = false
      }
    }

    function updateSyncStatus(status) {
      try {
        const syncElement = document.getElementById("sync-status")
        if (!syncElement) return

        switch (status) {
          case "synced":
            syncElement.innerHTML = "✓ Synced"
            syncElement.style.color = "#43cea2"
            break
          case "syncing":
            syncElement.innerHTML = "🔄 Syncing..."
            syncElement.style.color = "#ffc107"
            break
          case "pending":
            syncElement.innerHTML = "⏳ Pending sync"
            syncElement.style.color = "#ffc107"
            break
          case "offline":
            syncElement.innerHTML = "📱 Offline"
            syncElement.style.color = "#6c757d"
            break
          case "error":
            syncElement.innerHTML = "❌ Sync error"
            syncElement.style.color = "#dc3545"
            break
        }
      } catch (error) {
        console.error("Error updating sync status:", error)
      }
    }

    // --- Tab switching ---
    function setupTabSwitching() {
      try {
        document.querySelectorAll(".tab-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            try {
              document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"))
              btn.classList.add("active")

              document.querySelectorAll(".tab-content").forEach((tab) => (tab.style.display = "none"))
              const targetTab = document.getElementById(btn.dataset.tab)
              if (targetTab) {
                targetTab.style.display = ""
              }
            } catch (error) {
              console.error("Error in tab switching:", error)
            }
          })
        })
      } catch (error) {
        console.error("Error setting up tab switching:", error)
      }
    }

    // --- Page Initialization ---
    function initializePage() {
      try {
        console.log("Page loading...")

        // Initialize Firebase after DOM is loaded
        initializeFirebase()

        // Load shift start time
        loadShiftStartTime()

        // Set up initial tab visibility
        document.querySelectorAll(".tab-content").forEach((tab) => (tab.style.display = "none"))
        const dashboardTab = document.getElementById("dashboard")
        if (dashboardTab) {
          dashboardTab.style.display = ""
        }

        document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
        const dashboardBtn = document.querySelector('.tab-btn[data-tab="dashboard"]')
        if (dashboardBtn) {
          dashboardBtn.classList.add("active")
        }

        // Load sync queue from localStorage
        try {
          const savedQueue = localStorage.getItem("popsey_sync_queue")
          if (savedQueue) {
            syncQueue = JSON.parse(savedQueue)
          }
        } catch (error) {
          console.error("Error loading sync queue:", error)
        }

        updateConnectionStatus()

        // Try to load saved state first
        const hasLoadedData = loadCompleteState()

        // If no saved data, initialize with EMPTY tables (no default rows)
        if (!hasLoadedData) {
          console.log("No saved data found, initializing with empty tables")
          clearAllTables()
        }

        // Set up tab switching
        setupTabSwitching()

        // Set up all event listeners
        setupEventListeners()

        // Start live clock
        startLiveClock()

        // Initial dashboard update and history load
        updateDashboardValues()
        updateBilliardTotal()
        updateGroceryTotal()
        loadShiftHistoryTable()

        // Initialize calculator displays
        updateCalculatorDisplays()

        // ENHANCED: Set up Firebase sync AFTER initial load is complete
        setTimeout(() => {
          isInitialLoad = false // Mark initial load as complete
          initializeFirebaseSync()

          // Load shift history from Firebase
          loadShiftHistoryFromFirebase()

          // Set up real-time history sync
          setupHistorySync()
        }, 1500) // Reduced delay for faster sync

        console.log("Page initialization complete")
      } catch (error) {
        console.error("Error in page initialization:", error)
      }
    }

    // --- NEW: Real-time History Sync ---
    function setupHistorySync() {
      try {
        if (!firebaseInitialized || !database) return

        console.log("Setting up real-time history synchronization...")

        // Listen for new history items
        database.ref("popsey/shift_history").on("child_added", (snapshot) => {
          try {
            if (isInitialLoad) return // Skip during initial load

            const newHistoryItem = snapshot.val()
            if (newHistoryItem) {
              // Get current local history
              let localHistory = []
              try {
                localHistory = JSON.parse(localStorage.getItem("popsey_shift_history")) || []
              } catch {}

              // Check if this item already exists locally
              const existsLocally = localHistory.find((item) => item.id === newHistoryItem.id)

              if (!existsLocally) {
                console.log("New history item received from Firebase:", newHistoryItem.id)
                localHistory.push(newHistoryItem)
                localStorage.setItem("popsey_shift_history", JSON.stringify(localHistory))
                loadShiftHistoryTable() // Refresh the table
              }
            }
          } catch (error) {
            console.error("Error processing new history item:", error)
          }
        })

        // Listen for deleted history items
        database.ref("popsey/shift_history").on("child_removed", (snapshot) => {
          try {
            if (isInitialLoad) return // Skip during initial load

            const deletedItem = snapshot.val()
            if (deletedItem) {
              console.log("History item deleted from Firebase:", deletedItem.id)

              // Remove from local storage
              let localHistory = []
              try {
                localHistory = JSON.parse(localStorage.getItem("popsey_shift_history")) || []
              } catch {}

              localHistory = localHistory.filter((item) => item.id !== deletedItem.id)
              localStorage.setItem("popsey_shift_history", JSON.stringify(localHistory))
              loadShiftHistoryTable() // Refresh the table
            }
          } catch (error) {
            console.error("Error processing deleted history item:", error)
          }
        })

        console.log("Real-time history synchronization enabled")
      } catch (error) {
        console.error("Error setting up history sync:", error)
      }
    }

    // --- Billiard Table Logic ---
    function getAmount(tableType, mode) {
      try {
        if (mode === "hour") return 100
        if (tableType === "m8" || tableType === "m7") return 15
        if (tableType === "alpha" || tableType === "regal") return 10
        return 0
      } catch (error) {
        console.error("Error in getAmount:", error)
        return 0
      }
    }

    function renderTally(n) {
      try {
        if (n <= 0) return ""
        let tally = ""
        const groups = Math.floor(n / 5)
        const remainder = n % 5

        for (let i = 0; i < groups; i++) {
          tally += '||||/<span style="margin:0 6px;">-</span>'
        }
        for (let i = 0; i < remainder; i++) {
          tally += "|"
        }
        return tally
      } catch (error) {
        console.error("Error in renderTally:", error)
        return ""
      }
    }

    function updateBilliardRow(row) {
      try {
        if (!row) return

        const tableType = row.querySelector(".tableType")?.value || "m8"
        const mode = row.querySelector(".mode-btn")?.dataset.mode || "mesada"
        const amountInput = row.querySelector(".amount")
        const amount = getAmount(tableType, mode)

        if (amountInput) {
          amountInput.value = amount
        }

        const gamesValueEl = row.querySelector(".games-value")
        const gamesValue = Number.parseInt(gamesValueEl?.textContent) || 0

        const gamesTallyEl = row.querySelector(".games-tally")
        if (gamesTallyEl) {
          gamesTallyEl.innerHTML = renderTally(gamesValue)
        }

        // Paid history logic
        if (!row._paidHistory) row._paidHistory = []
        const paidValue = row._paidHistory.reduce((sum, v) => sum + v, 0)

        const paidValueEl = row.querySelector(".paid-value")
        if (paidValueEl) {
          paidValueEl.textContent = paidValue
        }

        // Render paid history
        const paidHistoryDiv = row.querySelector(".paid-history")
        if (paidHistoryDiv) {
          paidHistoryDiv.innerHTML = ""
          row._paidHistory.forEach((val, idx) => {
            const item = document.createElement("div")
            item.className = "paid-history-item"
            item.innerHTML = `<span class="paid-history-value">${val}</span>
              <button class="paid-history-delete" data-idx="${idx}">Delete</button>`
            paidHistoryDiv.appendChild(item)
          })
        }

        const total = amount * gamesValue
        const totalPaid = paidValue
        const balance = total - totalPaid

        const totalEl = row.querySelector(".total")
        const totalPaidEl = row.querySelector(".totalPaid")
        const balanceEl = row.querySelector(".balance")

        if (totalEl) totalEl.textContent = total
        if (totalPaidEl) totalPaidEl.textContent = totalPaid
        if (balanceEl) balanceEl.textContent = balance

        const statusCell = row.querySelector(".status")
        if (statusCell) {
          if (totalPaid > 0 && balance === 0) {
            statusCell.textContent = "Paid"
            statusCell.className = "status status-paid"
          } else {
            statusCell.textContent = "Unpaid"
            statusCell.className = "status status-unpaid"
          }
        }

        // Active/done button logic
        if (typeof row._isActive === "undefined") row._isActive = true
        const activeBtn = row.querySelector(".active-switch-btn")
        if (activeBtn) {
          activeBtn.textContent = row._isActive ? "Active" : "Done"
          activeBtn.dataset.active = row._isActive ? "true" : "false"
        }

        filterBilliardRows()
        updateBilliardTotal()

        // ENHANCED: Trigger immediate save for critical actions
        if (!isInitialLoad && !isFirebaseSyncPaused) {
          triggerAutoSave("billiard_update", true) // Immediate save
        }
      } catch (error) {
        console.error("Error in updateBilliardRow:", error)
      }
    }

    function attachBilliardRowEvents(row) {
      try {
        if (!row) return

        // Table type change
        const tableTypeEl = row.querySelector(".tableType")
        if (tableTypeEl) {
          tableTypeEl.addEventListener("change", () => {
            updateBilliardRow(row)
            filterBilliardRows()
            if (!isInitialLoad && !isFirebaseSyncPaused) {
              triggerAutoSave("billiard_table_change", true) // Immediate save
            }
          })
        }

        // Name input change
        const nameEl = row.querySelector(".name")
        if (nameEl) {
          nameEl.addEventListener("input", () => {
            if (!isInitialLoad && !isFirebaseSyncPaused) {
              triggerAutoSave("billiard_name_change") // Regular debounced save for typing
            }
          })
        }

        // Mode switch with confirmation
        const modeBtnEl = row.querySelector(".mode-btn")
        if (modeBtnEl) {
          modeBtnEl.addEventListener("click", () => {
            const btn = row.querySelector(".mode-btn")
            const currentMode = btn.dataset.mode
            const nextMode = currentMode === "mesada" ? "hour" : "mesada"

            const confirmMsg =
              currentMode === "mesada"
                ? "Switch to Hour mode? This will set the amount to 100."
                : "Switch to Mesada mode? This will set the amount based on table type."

            if (window.confirm(confirmMsg)) {
              btn.dataset.mode = nextMode
              btn.textContent = nextMode.charAt(0).toUpperCase() + nextMode.slice(1)

              if (nextMode === "hour") {
                btn.classList.add("active")
              } else {
                btn.classList.remove("active")
              }

              updateBilliardRow(row)
              if (!isInitialLoad && !isFirebaseSyncPaused) {
                triggerAutoSave("billiard_mode_change", true) // Immediate save
              }
            }
          })
        }

        // Add game button (adds one tally, with delay)
        let addGameLocked = false
        const addGameBtn = row.querySelector(".add-game-btn")
        if (addGameBtn) {
          addGameBtn.addEventListener("click", () => {
            if (addGameLocked) return
            addGameLocked = true

            const gamesValueEl = row.querySelector(".games-value")
            if (gamesValueEl) {
              const val = Number.parseInt(gamesValueEl.textContent) || 0
              gamesValueEl.textContent = val + 1
              updateBilliardRow(row)
              if (!isInitialLoad && !isFirebaseSyncPaused) {
                triggerAutoSave("billiard_add_game", true) // Immediate save
              }
            }

            setTimeout(() => {
              addGameLocked = false
            }, 350)
          })
        }

        // Delete game button (removes one tally, NO confirm, with delay)
        let delGameLocked = false
        const delGameBtn = row.querySelector(".delete-game-btn")
        if (delGameBtn) {
          delGameBtn.addEventListener("click", () => {
            if (delGameLocked) return
            delGameLocked = true

            const gamesValueEl = row.querySelector(".games-value")
            if (gamesValueEl) {
              const val = Number.parseInt(gamesValueEl.textContent) || 0
              const newVal = Math.max(0, val - 1)
              gamesValueEl.textContent = newVal
              updateBilliardRow(row)
              if (!isInitialLoad && !isFirebaseSyncPaused) {
                triggerAutoSave("billiard_delete_game", true) // Immediate save
              }
            }

            setTimeout(() => {
              delGameLocked = false
            }, 350)
          })
        }

        // Paid add button (with delay)
        let addPaidLocked = false
        const addPaidBtn = row.querySelector(".add-paid-btn")
        if (addPaidBtn) {
          addPaidBtn.addEventListener("click", () => {
            if (addPaidLocked) return

            const paidInputEl = row.querySelector(".paid-input")
            if (paidInputEl) {
              const inputVal = Number.parseFloat(paidInputEl.value) || 0
              if (inputVal > 0) {
                addPaidLocked = true
                if (!row._paidHistory) row._paidHistory = []
                row._paidHistory.push(inputVal)
                paidInputEl.value = 0
                updateBilliardRow(row)
                if (!isInitialLoad && !isFirebaseSyncPaused) {
                  triggerAutoSave("billiard_add_payment", true) // Immediate save
                }

                setTimeout(() => {
                  addPaidLocked = false
                }, 350)
              }
            }
          })
        }

        // Paid history delete buttons (delegated, with confirm and delay)
        let delPaidLocked = false
        const paidHistoryEl = row.querySelector(".paid-history")
        if (paidHistoryEl) {
          paidHistoryEl.addEventListener("click", (e) => {
            if (delPaidLocked) return
            if (e.target.classList.contains("paid-history-delete")) {
              const idx = Number.parseInt(e.target.dataset.idx)
              if (!isNaN(idx) && row._paidHistory) {
                if (window.confirm("Delete this paid entry?")) {
                  delPaidLocked = true
                  row._paidHistory.splice(idx, 1)
                  updateBilliardRow(row)
                  if (!isInitialLoad && !isFirebaseSyncPaused) {
                    triggerAutoSave("billiard_delete_payment", true) // Immediate save
                  }

                  setTimeout(() => {
                    delPaidLocked = false
                  }, 350)
                }
              }
            }
          })
        }

        // Active/done switch (always pressable by user)
        const activeBtn = row.querySelector(".active-switch-btn")
        if (activeBtn) {
          activeBtn.addEventListener("click", () => {
            row._isActive = !(row._isActive === true) // toggle between true/false
            updateBilliardRow(row)
            if (!isInitialLoad && !isFirebaseSyncPaused) {
              triggerAutoSave("billiard_toggle_active", true) // Immediate save
            }
          })
        }
      } catch (error) {
        console.error("Error attaching billiard row events:", error)
      }
    }

    // Modified addBilliardRow function to add new rows at the top
    function addBilliardRow() {
      try {
        console.log("Adding new billiard row...")
        const tbody = document.getElementById("billiardTbody")
        if (!tbody) return

        const tr = document.createElement("tr")
        tr.innerHTML = `
          <td>
            <button class="active-switch-btn" data-active="true">Active</button>
          </td>
          <td class="status status-unpaid">Unpaid</td>
          <td>
            <select class="tableType">
              <option value="m8">M8</option>
              <option value="m7">M7</option>
              <option value="alpha">Alpha</option>
              <option value="regal">Regal</option>
            </select>
            <button class="mode-btn" data-mode="mesada">Mesada</button>
          </td>
          <td><input type="number" class="amount" value="15" readonly></td>
          <td>
            <span class="games-value">0</span>
            <div class="games-tally" style="display:inline-block;vertical-align:middle;"></div>
            <button class="add-game-btn">Add</button>
            <button class="delete-game-btn">Delete</button>
          </td>
          <td class="total">0</td>
          <td>
            <span class="paid-value">0</span>
            <input type="number" class="paid-input" value="0" min="0" style="width:60px;">
            <button class="add-paid-btn">Add</button>
            <div class="paid-history"></div>
          </td>
          <td class="totalPaid">0</td>
          <td class="balance">0</td>
          <td>
            <input type="text" class="name">
            <button class="delete-row-btn" title="Delete Row">Delete</button>
          </td>
        `

        // Insert at the top instead of bottom
        if (tbody.children.length > 0) {
          tbody.insertBefore(tr, tbody.children[0])
        } else {
          tbody.appendChild(tr)
        }

        attachBilliardRowEvents(tr)
        updateBilliardRow(tr)
        billiardRows.unshift(tr) // Add to beginning of array
        filterBilliardRows()

        // IMMEDIATE SAVE after adding row
        triggerAutoSave("add_billiard_row", true)
        console.log(`Billiard row added. Total rows: ${billiardRows.length}`)
      } catch (error) {
        console.error("Error adding billiard row:", error)
      }
    }

    // --- Billiard Filters ---
    function filterBilliardRows() {
      try {
        const filterBtns = document.querySelectorAll(".billiard-filter-btn.active")
        if (!filterBtns) return

        const activeFilters = Array.from(filterBtns).map((btn) => btn.dataset.filter)

        // If 'all' is active, show all rows
        if (activeFilters.includes("all") || activeFilters.length === 0) {
          billiardRows.forEach((row) => (row.style.display = ""))
          updateBilliardTotal()
          return
        }

        billiardRows.forEach((row) => {
          let show = true
          const tableTypeEl = row.querySelector(".tableType")
          const statusEl = row.querySelector(".status")

          if (!tableTypeEl || !statusEl) return

          const tableType = tableTypeEl.value
          const status = statusEl.textContent.toLowerCase()
          const isActive = row._isActive !== false

          // Table type filters
          const typeFilters = ["m8", "m7", "alpha", "regal"]
          const typeActive = activeFilters.filter((f) => typeFilters.includes(f))
          if (typeActive.length > 0 && !typeActive.includes(tableType)) {
            show = false
          }

          // Status filters
          if (activeFilters.includes("paid") && status !== "paid") show = false
          if (activeFilters.includes("unpaid") && status !== "unpaid") show = false

          // Active/Done filters
          if (activeFilters.includes("active") && !isActive) show = false
          if (activeFilters.includes("done") && isActive) show = false

          row.style.display = show ? "" : "none"
        })

        updateBilliardTotal()
      } catch (error) {
        console.error("Error filtering billiard rows:", error)
      }
    }

    // --- Grocery Filters ---
    function filterGroceryRows() {
      try {
        const filterBtns = document.querySelectorAll(".grocery-filter-btn.active")
        if (!filterBtns) return

        const activeFilters = Array.from(filterBtns).map((btn) => btn.dataset.filter)

        // If 'all' is active, show all rows
        if (activeFilters.includes("all") || activeFilters.length === 0) {
          groceryRows.forEach((row) => (row.style.display = ""))
          updateGroceryTotal()
          return
        }

        groceryRows.forEach((row) => {
          let show = true
          const tableNameEl = row.querySelector(".grocery-table")

          if (!tableNameEl) return

          const tableName = tableNameEl.value.trim()
          const status = row._status || "Unpaid"

          // Determine the actual status based on table name and _status
          let actualStatus = ""
          if (!tableName) {
            actualStatus = "purchase"
          } else {
            actualStatus = status.toLowerCase()
          }

          // Status filters
          if (activeFilters.includes("purchase") && actualStatus !== "purchase") show = false
          if (activeFilters.includes("paid") && actualStatus !== "paid") show = false
          if (activeFilters.includes("unpaid") && actualStatus !== "unpaid") show = false

          row.style.display = show ? "" : "none"
        })

        updateGroceryTotal()
      } catch (error) {
        console.error("Error filtering grocery rows:", error)
      }
    }

    // --- Grocery Table Logic ---
    function updateGroceryRow(row) {
      try {
        if (!row) return

        const amountEl = row.querySelector(".grocery-amount")
        const purchasesEl = row.querySelector(".grocery-purchases-value")
        const totalItemsEl = row.querySelector(".grocery-total-items")
        const totalEl = row.querySelector(".grocery-total")
        const statusCellEl = row.querySelector(".grocery-status-cell")
        const tableNameEl = row.querySelector(".grocery-table")

        if (!amountEl || !purchasesEl || !totalItemsEl || !totalEl || !statusCellEl || !tableNameEl) return

        const amount = Number.parseFloat(amountEl.value) || 0
        const purchases = Number.parseInt(purchasesEl.textContent) || 0
        const totalItems = purchases
        const total = amount * totalItems
        const tableName = tableNameEl.value.trim()

        totalItemsEl.textContent = totalItems
        totalEl.textContent = total.toFixed(2)

        // Update status based on table name
        if (!tableName) {
          // No table name = show "Purchase" status (not clickable)
          statusCellEl.innerHTML = '<span class="grocery-status grocery-purchase">Purchase</span>'
        } else {
          // Has table name = show clickable button
          const currentStatus = row._status || "Unpaid"
          const statusClass = currentStatus === "Paid" ? "paid" : "unpaid"
          statusCellEl.innerHTML = `<button class="grocery-status-btn ${statusClass}" data-status="${currentStatus}">${currentStatus}</button>`

          // Attach click event to the new button
          const statusBtn = statusCellEl.querySelector(".grocery-status-btn")
          if (statusBtn) {
            statusBtn.addEventListener("click", () => {
              const newStatus = row._status === "Paid" ? "Unpaid" : "Paid"
              row._status = newStatus
              updateGroceryRow(row)
              if (!isInitialLoad && !isFirebaseSyncPaused) {
                triggerAutoSave("grocery_status_change", true) // Immediate save
              }
            })
          }
        }

        // ENHANCED: Trigger immediate save for critical actions
        if (!isInitialLoad && !isFirebaseSyncPaused) {
          triggerAutoSave("grocery_update", true) // Immediate save
        }

        // Filter rows after update
        filterGroceryRows()
      } catch (error) {
        console.error("Error updating grocery row:", error)
      }
    }

    // Attach events to grocery rows
    function attachGroceryRowEvents(row) {
      try {
        if (!row) return

        // Initialize purchases and status if not exists
        if (!row._purchases) row._purchases = 0
        if (!row._status) row._status = "Unpaid"

        // Amount input change
        const amountEl = row.querySelector(".grocery-amount")
        if (amountEl) {
          amountEl.addEventListener("input", () => {
            updateGroceryRow(row)
            if (!isInitialLoad && !isFirebaseSyncPaused) {
              triggerAutoSave("grocery_amount_change", true) // Immediate save
            }
          })
        }

        // Table/Name input for recall and status update
        const tableInput = row.querySelector(".grocery-table")
        if (tableInput) {
          tableInput.addEventListener("input", function () {
            const value = this.value.trim()
            if (value && !groceryRecallTableNames.includes(value)) {
              groceryRecallTableNames.push(value)
            }
            updateGroceryRow(row) // Update status based on table name
            filterGroceryRows() // Filter rows after table name change
            if (!isInitialLoad && !isFirebaseSyncPaused) {
              triggerAutoSave("grocery_table_change") // Regular debounced save for typing
            }
          })
        }

        // Item input for recall
        const itemInput = row.querySelector(".grocery-item")
        if (itemInput) {
          itemInput.addEventListener("input", function () {
            const value = this.value.trim()
            if (value && !groceryRecallItems.includes(value)) {
              groceryRecallItems.push(value)
            }
            if (!isInitialLoad && !isFirebaseSyncPaused) {
              triggerAutoSave("grocery_item_change") // Regular debounced save for typing
            }
          })
        }

        // Add purchase button
        let addPurchaseLocked = false
        const addPurchaseBtn = row.querySelector(".grocery-add-purchase-btn")
        if (addPurchaseBtn) {
          addPurchaseBtn.addEventListener("click", () => {
            if (addPurchaseLocked) return
            addPurchaseLocked = true

            const purchaseInput = row.querySelector(".grocery-purchases-input")
            const purchasesValueEl = row.querySelector(".grocery-purchases-value")

            if (purchaseInput && purchasesValueEl) {
              const purchaseAmount = Number.parseInt(purchaseInput.value) || 1
              row._purchases = (row._purchases || 0) + purchaseAmount
              purchasesValueEl.textContent = row._purchases
              updateGroceryRow(row)
              if (!isInitialLoad && !isFirebaseSyncPaused) {
                triggerAutoSave("grocery_add_purchase", true) // Immediate save
              }
            }

            setTimeout(() => {
              addPurchaseLocked = false
            }, 350)
          })
        }

        // Delete purchase button
        let deletePurchaseLocked = false
        const deletePurchaseBtn = row.querySelector(".grocery-delete-purchase-btn")
        if (deletePurchaseBtn) {
          deletePurchaseBtn.addEventListener("click", () => {
            if (deletePurchaseLocked) return
            deletePurchaseLocked = true

            const purchaseInput = row.querySelector(".grocery-purchases-input")
            const purchasesValueEl = row.querySelector(".grocery-purchases-value")

            if (purchaseInput && purchasesValueEl) {
              const purchaseAmount = Number.parseInt(purchaseInput.value) || 1
              row._purchases = Math.max(0, (row._purchases || 0) - purchaseAmount)
              purchasesValueEl.textContent = row._purchases
              updateGroceryRow(row)
              if (!isInitialLoad && !isFirebaseSyncPaused) {
                triggerAutoSave("grocery_delete_purchase", true) // Immediate save
              }
            }

            setTimeout(() => {
              deletePurchaseLocked = false
            }, 350)
          })
        }
      } catch (error) {
        console.error("Error attaching grocery row events:", error)
      }
    }

    // Modified addGroceryRow function to add new rows at the top like billiard
    function addGroceryRow() {
      try {
        console.log("Adding new grocery row...")
        const tbody = document.getElementById("groceryTbody")
        if (!tbody) return

        const tr = document.createElement("tr")
        tr.innerHTML = `
          <td class="grocery-status-cell"><span class="grocery-status grocery-purchase">Purchase</span></td>
          <td><input type="text" class="grocery-table"></td>
          <td><input type="text" class="grocery-item"></td>
          <td><input type="number" class="grocery-amount" value="0"></td>
          <td>
            <span class="grocery-purchases-value">0</span>
            <input type="number" class="grocery-purchases-input" value="1" min="1" style="width:50px;">
            <button class="grocery-add-purchase-btn">Add</button>
            <button class="grocery-delete-purchase-btn">Delete</button>
          </td>
          <td class="grocery-total-items">0</td>
          <td class="grocery-total">0</td>
          <td>
            <button class="grocery-delete-row-btn" title="Delete Row">Delete</button>
          </td>
        `

        // Insert at the top instead of bottom
        if (tbody.children.length > 0) {
          tbody.insertBefore(tr, tbody.children[0])
        } else {
          tbody.appendChild(tr)
        }

        tr._purchases = 0
        tr._status = "Unpaid"
        attachGroceryRowEvents(tr)
        updateGroceryRow(tr)
        groceryRows.unshift(tr) // Add to beginning of array

        // IMMEDIATE SAVE after adding row
        triggerAutoSave("add_grocery_row", true)
        console.log(`Grocery row added. Total rows: ${groceryRows.length}`)
      } catch (error) {
        console.error("Error adding grocery row:", error)
      }
    }

    // --- Expense Management Functions ---
    function showExpenseModal() {
      try {
        const modal = document.getElementById("expenseModal")
        const nameInput = document.getElementById("expenseNameInput")
        const amountInput = document.getElementById("expenseAmountInput")

        if (modal && nameInput && amountInput) {
          nameInput.value = ""
          amountInput.value = ""
          modal.style.display = "block"
          nameInput.focus()
        }
      } catch (error) {
        console.error("Error showing expense modal:", error)
      }
    }

    function hideExpenseModal() {
      try {
        const modal = document.getElementById("expenseModal")
        if (modal) {
          modal.style.display = "none"
        }
      } catch (error) {
        console.error("Error hiding expense modal:", error)
      }
    }

    function showEditExpenseModal(expenseData) {
      try {
        const modal = document.getElementById("editExpenseModal")
        const nameInput = document.getElementById("editExpenseNameInput")
        const amountInput = document.getElementById("editExpenseAmountInput")

        if (modal && nameInput && amountInput) {
          nameInput.value = expenseData.expense
          amountInput.value = expenseData.amount
          modal.style.display = "block"
          nameInput.focus()
        }
      } catch (error) {
        console.error("Error showing edit expense modal:", error)
      }
    }

    function hideEditExpenseModal() {
      try {
        const modal = document.getElementById("editExpenseModal")
        if (modal) {
          modal.style.display = "none"
        }
        currentEditingExpenseRow = null
      } catch (error) {
        console.error("Error hiding edit expense modal:", error)
      }
    }

    function addExpenseRow() {
      try {
        const nameInput = document.getElementById("expenseNameInput")
        const amountInput = document.getElementById("expenseAmountInput")

        if (!nameInput || !amountInput) return

        const expense = nameInput.value.trim()
        const amount = Number.parseFloat(amountInput.value) || 0

        if (!expense) {
          alert("Please enter an expense name")
          return
        }

        if (amount <= 0) {
          alert("Please enter a valid amount")
          return
        }

        console.log("Adding new expense row...")
        const tbody = document.getElementById("expenseTbody")
        if (!tbody) return

        const tr = document.createElement("tr")
        tr.innerHTML = `
          <td class="expense-name">${expense}</td>
          <td class="expense-amount">₱${amount.toFixed(2)}</td>
          <td>
            <button class="expense-edit-btn">Edit</button>
            <button class="expense-delete-btn">Delete</button>
          </td>
        `

        // Store data on the row
        tr._expenseData = {
          expense: expense,
          amount: amount,
        }

        // Insert at the top of the table
        if (tbody.children.length > 0) {
          tbody.insertBefore(tr, tbody.children[0])
        } else {
          tbody.appendChild(tr)
        }

        attachExpenseRowEvents(tr)
        expenseRows.unshift(tr) // Add to beginning of array

        // Hide modal and trigger immediate save
        hideExpenseModal()
        triggerAutoSave("add_expense_row", true)
        console.log(`Expense row added. Total rows: ${expenseRows.length}`)
      } catch (error) {
        console.error("Error adding expense row:", error)
      }
    }

    function updateExpenseRow() {
      try {
        if (!currentEditingExpenseRow) return

        const nameInput = document.getElementById("editExpenseNameInput")
        const amountInput = document.getElementById("editExpenseAmountInput")

        if (!nameInput || !amountInput) return

        const expense = nameInput.value.trim()
        const amount = Number.parseFloat(amountInput.value) || 0

        if (!expense) {
          alert("Please enter an expense name")
          return
        }

        if (amount <= 0) {
          alert("Please enter a valid amount")
          return
        }

        // Update the row content
        const nameCell = currentEditingExpenseRow.querySelector(".expense-name")
        const amountCell = currentEditingExpenseRow.querySelector(".expense-amount")

        if (nameCell && amountCell) {
          nameCell.textContent = expense
          amountCell.textContent = `₱${amount.toFixed(2)}`

          // Update stored data
          currentEditingExpenseRow._expenseData = {
            expense: expense,
            amount: amount,
          }
        }

        // Hide modal and trigger immediate save
        hideEditExpenseModal()
        triggerAutoSave("update_expense_row", true)
        console.log("Expense row updated")
      } catch (error) {
        console.error("Error updating expense row:", error)
      }
    }

    function attachExpenseRowEvents(row) {
      try {
        if (!row) return

        // Edit button
        const editBtn = row.querySelector(".expense-edit-btn")
        if (editBtn) {
          editBtn.addEventListener("click", () => {
            currentEditingExpenseRow = row
            showEditExpenseModal(row._expenseData)
          })
        }

        // Delete button with immediate sync
        const deleteBtn = row.querySelector(".expense-delete-btn")
        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => {
            if (window.confirm("Are you sure you want to delete this expense?")) {
              row.remove()
              expenseRows = expenseRows.filter((r) => r !== row)

              // IMMEDIATE Firebase sync for deletions
              updateDashboardValues()
              saveCompleteState()
              console.log(`Expense row deleted. Total rows: ${expenseRows.length}`)
            }
          })
        }
      } catch (error) {
        console.error("Error attaching expense row events:", error)
      }
    }

    function collectExpenseData() {
      try {
        const expenseData = []
        document.querySelectorAll("#expenseTbody tr").forEach((tr) => {
          if (tr._expenseData) {
            expenseData.push({
              expense: tr._expenseData.expense,
              amount: tr._expenseData.amount,
            })
          }
        })
        return expenseData
      } catch (error) {
        console.error("Error collecting expense data:", error)
        return []
      }
    }

    // --- Dashboard Logic ---
    function updateDashboardValues() {
      try {
        // Calculate billiard total paid

        let billiardPaid = 0
        document.querySelectorAll("#billiardTbody tr").forEach((tr) => {
          const paidElement = tr.querySelector(".paid-value")
          if (paidElement) {
            const paid = Number.parseFloat(paidElement.textContent) || 0
            billiardPaid += paid
          }
        })

        // Calculate grocery total
        let groceryTotal = 0
        document.querySelectorAll("#groceryTbody tr").forEach((tr) => {
          const totalElement = tr.querySelector(".grocery-total")
          if (totalElement) {
            const total = Number.parseFloat(totalElement.textContent) || 0
            groceryTotal += total
          }
        })

        // Calculate expense total
        let expenseTotal = 0
        document.querySelectorAll("#expenseTbody tr").forEach((tr) => {
          if (tr._expenseData) {
            expenseTotal += tr._expenseData.amount
          }
        })

        // Calculate combined total (only billiard + grocery, NOT expenses)
        const combinedTotal = billiardPaid + groceryTotal

        // Update dashboard cards in real-time (check if elements exist)
        const billiardPaidEl = document.getElementById("dashboard-billiard-paid")
        const groceryTotalEl = document.getElementById("dashboard-grocery-total")
        const expenseTotalEl = document.getElementById("dashboard-expense-total")
        const combinedTotalEl = document.getElementById("dashboard-combined-total")

        if (billiardPaidEl) billiardPaidEl.textContent = billiardPaid.toFixed(2)
        if (groceryTotalEl) groceryTotalEl.textContent = groceryTotal.toFixed(2)
        if (expenseTotalEl) expenseTotalEl.textContent = expenseTotal.toFixed(2)
        if (combinedTotalEl) combinedTotalEl.textContent = combinedTotal.toFixed(2)

        // Save complete state automatically only if not during initial load or sync
        if (!isInitialLoad && !isFirebaseSyncPaused) {
          saveCompleteState()
        }
      } catch (error) {
        console.error("Error updating dashboard values:", error)
      }
    }

    function collectBilliardData() {
      try {
        const billiardData = []
        document.querySelectorAll("#billiardTbody tr").forEach((tr) => {
          const name = tr.querySelector(".name")?.value || ""
          const tableType = tr.querySelector(".tableType")?.value || ""
          const paid = Number.parseFloat(tr.querySelector(".paid-value")?.textContent) || 0
          const total = Number.parseFloat(tr.querySelector(".total")?.textContent) || 0
          const amount = Number.parseFloat(tr.querySelector(".amount")?.value) || 0
          const games = Number.parseInt(tr.querySelector(".games-value")?.textContent) || 0
          const balance = Number.parseFloat(tr.querySelector(".balance")?.textContent) || 0
          const status = tr.querySelector(".status")?.textContent || ""
          const isActive = tr._isActive !== false
          const mode = tr.querySelector(".mode-btn")?.dataset.mode || "mesada"

          billiardData.push({
            name,
            tableType,
            amount,
            games,
            total,
            paid,
            balance,
            status,
            isActive,
            mode,
            paidHistory: tr._paidHistory || [],
          })
        })
        return billiardData
      } catch (error) {
        console.error("Error collecting billiard data:", error)
        return []
      }
    }

    function collectGroceryData() {
      try {
        const groceryData = []
        document.querySelectorAll("#groceryTbody tr").forEach((tr) => {
          const tableName = tr.querySelector(".grocery-table")?.value || ""
          const item = tr.querySelector(".grocery-item")?.value || ""
          const amount = Number.parseFloat(tr.querySelector(".grocery-amount")?.value || 0)
          const purchases = Number.parseInt(tr.querySelector(".grocery-purchases-value")?.textContent) || 0
          const totalItems = Number.parseInt(tr.querySelector(".grocery-total-items")?.textContent) || 0
          const total = Number.parseFloat(tr.querySelector(".grocery-total")?.textContent) || 0
          const status = tr._status || "Unpaid"

          groceryData.push({
            tableName,
            item,
            amount,
            purchases,
            totalItems,
            total,
            status,
          })
        })
        return groceryData
      } catch (error) {
        console.error("Error collecting grocery data:", error)
        return []
      }
    }

    function getTodayDate() {
      try {
        const d = new Date()
        return d.toLocaleDateString() + " " + d.toLocaleTimeString()
      } catch (error) {
        console.error("Error getting today's date:", error)
        return "Unknown Date"
      }
    }

    function updateLiveClock() {
      try {
        const now = new Date()
        // Format date as "January 7, 2024"
        const dateOptions = {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
        const formattedDate = now.toLocaleDateString("en-US", dateOptions)

        // Format time as "HH:MM:SS AM/PM"
        const timeOptions = {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }
        const formattedTime = now.toLocaleTimeString("en-US", timeOptions)

        // Update dashboard elements
        const dateEl = document.getElementById("dashboard-date-text")
        const timeEl = document.getElementById("dashboard-live-time")

        if (dateEl) dateEl.textContent = formattedDate
        if (timeEl) timeEl.textContent = formattedTime
      } catch (error) {
        console.error("Error updating live clock:", error)
      }
    }

    function startLiveClock() {
      try {
        // Update immediately
        updateLiveClock()
        // Update every second
        setInterval(updateLiveClock, 1000)
      } catch (error) {
        console.error("Error starting live clock:", error)
      }
    }

    // --- Fixed End Shift Function ---
    function handleEndShift() {
      try {
        if (
          !window.confirm(
            "End shift and reset all tables? This will save current data to history and clear all entries.",
          )
        ) {
          return
        }

        // Get current data for export and history
        const currentData = {
          date: getTodayDate(),
          shiftStartTime: shiftStartTime || "Start shift not reported",
          billiardPaid: Number.parseFloat(document.getElementById("dashboard-billiard-paid")?.textContent) || 0,
          groceryTotal: Number.parseFloat(document.getElementById("dashboard-grocery-total")?.textContent) || 0,
          expenseTotal: Number.parseFloat(document.getElementById("dashboard-expense-total")?.textContent) || 0,
          combinedTotal: Number.parseFloat(document.getElementById("dashboard-combined-total")?.textContent) || 0,
          billiardRows: collectBilliardData(),
          groceryRows: collectGroceryData(),
          expenseRows: collectExpenseData(),
        }

        // Save to history first
        const historyItem = saveShiftHistory(currentData)

        // Reset tables to empty state and clear shift start time
        resetAllTables()
        shiftStartTime = null
        localStorage.removeItem("popsey_shift_start_time")
        updateShiftStartDisplay()

        // Reload history table
        loadShiftHistoryTable()

        // Show success message with download option
        const downloadPDF = window.confirm(
          "Shift ended successfully! Data has been saved to history and tables have been reset.\n\n" +
            "Would you like to download the PDF report for this shift?",
        )

        if (downloadPDF && historyItem) {
          const filename = `shift_end_${currentData.date.replace(/[: ]/g, "_")}.html`
          exportToPDF(currentData, filename)
        }
      } catch (error) {
        console.error("Error in handleEndShift:", error)
        alert("Error ending shift. Please try again.")
      }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
      try {
        // Calculator toggle button
        const calculatorBtn = document.getElementById("calculatorBtn")
        if (calculatorBtn) {
          calculatorBtn.addEventListener("click", toggleCalculator)
        }

        // Calculator close button
        const closeCalculatorBtn = document.getElementById("closeCalculator")
        if (closeCalculatorBtn) {
          closeCalculatorBtn.addEventListener("click", closeCalculator)
        }

        // Start shift button
        const startShiftBtn = document.getElementById("startShiftBtn")
        if (startShiftBtn) {
          startShiftBtn.addEventListener("click", handleStartShift)
        }

        // Filter button logic
        document.querySelectorAll(".billiard-filter-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            try {
              if (btn.dataset.filter === "all") {
                // Only 'all' can be active alone
                document.querySelectorAll(".billiard-filter-btn").forEach((b) => b.classList.remove("active"))
                btn.classList.add("active")
              } else {
                const allBtn = document.querySelector('.billiard-filter-btn[data-filter="all"]')
                if (allBtn) {
                  allBtn.classList.remove("active")
                }
                btn.classList.toggle("active")
              }
              filterBilliardRows()
            } catch (error) {
              console.error("Error in filter button click:", error)
            }
          })
        })

        // Grocery filter button logic
        document.querySelectorAll(".grocery-filter-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            try {
              if (btn.dataset.filter === "all") {
                // Only 'all' can be active alone
                document.querySelectorAll(".grocery-filter-btn").forEach((b) => b.classList.remove("active"))
                btn.classList.add("active")
              } else {
                const allBtn = document.querySelector('.grocery-filter-btn[data-filter="all"]')
                if (allBtn) {
                  allBtn.classList.remove("active")
                }
                btn.classList.toggle("active")
              }
              filterGroceryRows()
            } catch (error) {
              console.error("Error in grocery filter button click:", error)
            }
          })
        })

        // Add row button
        const addBilliardRowBtn = document.getElementById("addBilliardRow")
        if (addBilliardRowBtn) {
          addBilliardRowBtn.addEventListener("click", addBilliardRow)
        }

        // Row delete logic with immediate sync
        let delRowLocked = false
        const billiardTbody = document.getElementById("billiardTbody")
        if (billiardTbody) {
          billiardTbody.addEventListener("click", (e) => {
            if (e.target.classList.contains("delete-row-btn")) {
              if (delRowLocked) return
              if (window.confirm("Are you sure you want to delete this row?")) {
                delRowLocked = true
                const tr = e.target.closest("tr")
                if (tr) {
                  tr.remove()
                  // Remove from billiardRows array
                  billiardRows = billiardRows.filter((row) => row !== tr)
                  filterBilliardRows()

                  // IMMEDIATE Firebase sync for deletions
                  updateDashboardValues()
                  saveCompleteState()
                  console.log(`Billiard row deleted. Total rows: ${billiardRows.length}`)
                }
                setTimeout(() => {
                  delRowLocked = false
                }, 200) // Reduced delay
              }
            }
          })
        }

        // Add row button event for groceries
        const addGroceryRowBtn = document.getElementById("addGroceryRow")
        if (addGroceryRowBtn) {
          addGroceryRowBtn.addEventListener("click", addGroceryRow)
        }

        // Grocery row delete logic with immediate sync
        let delGroceryRowLocked = false
        const groceryTbody = document.getElementById("groceryTbody")
        if (groceryTbody) {
          groceryTbody.addEventListener("click", (e) => {
            if (e.target.classList.contains("grocery-delete-row-btn")) {
              if (delGroceryRowLocked) return
              if (window.confirm("Are you sure you want to delete this grocery row?")) {
                delGroceryRowLocked = true
                const tr = e.target.closest("tr")
                if (tr) {
                  tr.remove()
                  // Remove from groceryRows array
                  groceryRows = groceryRows.filter((row) => row !== tr)

                  // IMMEDIATE Firebase sync for deletions
                  updateDashboardValues()
                  saveCompleteState()
                  console.log(`Grocery row deleted. Total rows: ${groceryRows.length}`)
                }
                setTimeout(() => {
                  delGroceryRowLocked = false
                }, 200) // Reduced delay
              }
            }
          })
        }

        // Expense modal event listeners
        const addExpenseBtn = document.getElementById("addExpenseBtn")
        if (addExpenseBtn) {
          addExpenseBtn.addEventListener("click", showExpenseModal)
        }

        const saveExpenseBtn = document.getElementById("saveExpenseBtn")
        if (saveExpenseBtn) {
          saveExpenseBtn.addEventListener("click", addExpenseRow)
        }

        const cancelExpenseBtn = document.getElementById("cancelExpenseBtn")
        if (cancelExpenseBtn) {
          cancelExpenseBtn.addEventListener("click", hideExpenseModal)
        }

        const updateExpenseBtn = document.getElementById("updateExpenseBtn")
        if (updateExpenseBtn) {
          updateExpenseBtn.addEventListener("click", updateExpenseRow)
        }

        const cancelEditExpenseBtn = document.getElementById("cancelEditExpenseBtn")
        if (cancelEditExpenseBtn) {
          cancelEditExpenseBtn.addEventListener("click", hideEditExpenseModal)
        }

        // Close modals when clicking outside
        document.addEventListener("click", (e) => {
          const expenseModal = document.getElementById("expenseModal")
          const editExpenseModal = document.getElementById("editExpenseModal")
          if (e.target === expenseModal) {
            hideExpenseModal()
          }
          if (e.target === editExpenseModal) {
            hideEditExpenseModal()
          }
        })

        // Grocery search functionality
        const grocerySearchEl = document.getElementById("grocerySearch")
        if (grocerySearchEl) {
          grocerySearchEl.addEventListener("input", function () {
            const searchTerm = this.value.toLowerCase()
            document.querySelectorAll("#groceryTbody tr").forEach((row) => {
              const tableNameEl = row.querySelector(".grocery-table")
              const itemEl = row.querySelector(".grocery-item")
              if (tableNameEl && itemEl) {
                const tableName = tableNameEl.value.toLowerCase()
                const item = itemEl.value.toLowerCase()
                const matches = tableName.includes(searchTerm) || item.includes(searchTerm)
                row.style.display = matches ? "" : "none"
              }
            })
            updateGroceryTotal()
          })
        }

        // Load saved data button
        const loadDataBtn = document.getElementById("loadDataBtn")
        if (loadDataBtn) {
          loadDataBtn.addEventListener("click", () => {
            if (window.confirm("Load previously saved data? This will replace current data.")) {
              loadCompleteState()
            }
          })
        }

        // Export current data button
        const exportCurrentBtn = document.getElementById("exportCurrentBtn")
        if (exportCurrentBtn) {
          exportCurrentBtn.addEventListener("click", () => {
            const currentData = {
              date: getTodayDate(),
              shiftStartTime: shiftStartTime || "Start shift not reported",
              billiardPaid: Number.parseFloat(document.getElementById("dashboard-billiard-paid")?.textContent) || 0,
              groceryTotal: Number.parseFloat(document.getElementById("dashboard-grocery-total")?.textContent) || 0,
              expenseTotal: Number.parseFloat(document.getElementById("dashboard-expense-total")?.textContent) || 0,
              combinedTotal: Number.parseFloat(document.getElementById("dashboard-combined-total")?.textContent) || 0,
              billiardRows: collectBilliardData(),
              groceryRows: collectGroceryData(),
              expenseRows: collectExpenseData(),
            }
            const filename = `current_data_${currentData.date.replace(/[: ]/g, "_")}.html`
            exportToPDF(currentData, filename)
          })
        }

        // End shift button - UPDATED
        const endShiftBtn = document.getElementById("endShiftBtn")
        if (endShiftBtn) {
          endShiftBtn.addEventListener("click", handleEndShift)
        }

        // Clear history button
        const clearHistoryBtn = document.getElementById("clearHistoryBtn")
        if (clearHistoryBtn) {
          clearHistoryBtn.addEventListener("click", () => {
            if (!window.confirm("Are you sure you want to clear ALL shift history? This action cannot be undone."))
              return

            try {
              localStorage.removeItem("popsey_shift_history")
            } catch (error) {
              console.error("Error clearing history:", error)
            }

            // Clear Firebase history if available
            if (isOnline && firebaseInitialized && database) {
              try {
                database
                  .ref("popsey/shift_history")
                  .remove()
                  .then(() => console.log("Firebase history cleared"))
                  .catch((error) => console.error("Error clearing Firebase history:", error))
              } catch (error) {
                console.error("Error clearing Firebase history:", error)
              }
            }

            loadShiftHistoryTable()
            alert("All shift history has been cleared.")
          })
        }
      } catch (error) {
        console.error("Error setting up event listeners:", error)
      }
    }

    // --- History and Export Functions ---
    function loadShiftHistoryTable() {
      try {
        let history = []
        try {
          history = JSON.parse(localStorage.getItem("popsey_shift_history")) || []
        } catch {}

        const tbody = document.getElementById("dashboardHistoryTbody")
        if (!tbody) return // Safety check

        tbody.innerHTML = ""

        // Sort by timestamp (newest first)
        history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

        history.forEach((row) => {
          const tr = document.createElement("tr")
          tr.style.borderBottom = "1px solid #e3e7ed"
          tr.innerHTML = `
            <td style="padding:12px 8px; text-align:center;">${row.date}</td>
            <td style="padding:12px 8px; text-align:center; color:#28a745; font-weight:600;">${row.shiftStartTime || "Not reported"}</td>
            <td style="padding:12px 8px; text-align:center; color:#43cea2; font-weight:600;">${row.billiardPaid.toFixed(2)}</td>
            <td style="padding:12px 8px; text-align:center; color:#43cea2; font-weight:600;">${row.groceryTotal.toFixed(2)}</td>
            <td style="padding:12px 8px; text-align:center; color:#43cea2; font-weight:600;">${(row.expenseTotal || 0).toFixed(2)}</td>
            <td style="padding:12px 8px; text-align:center; color:#43cea2; font-weight:700; font-size:16px;">${row.combinedTotal.toFixed(2)}</td>
            <td style="padding:12px 8px; text-align:center;">
              <button onclick="openHistoryDetail('${row.id}')" style="padding:6px 12px; margin-right:4px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;">Open</button>
              <button onclick="reExportShift('${row.id}')" style="padding:6px 12px; margin-right:4px; background:#007bff; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;">Re-Export</button>
              <button onclick="deleteHistoryItem('${row.id}')" style="padding:6px 12px; background:#dc3545; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;">Delete</button>
            </td>
          `
          tbody.appendChild(tr)
        })

        if (history.length === 0) {
          const tr = document.createElement("tr")
          tr.innerHTML = `<td colspan="7" style="padding:20px; text-align:center; color:#888; font-style:italic;">No shift history available</td>`
          tbody.appendChild(tr)
        }
      } catch (error) {
        console.error("Error loading shift history table:", error)
      }
    }

    function saveShiftHistory(data) {
      try {
        // Save locally
        let history = []
        try {
          history = JSON.parse(localStorage.getItem("popsey_shift_history")) || []
        } catch {}

        const historyItem = {
          id: Date.now(),
          date: data.date,
          shiftStartTime: data.shiftStartTime,
          billiardPaid: data.billiardPaid,
          groceryTotal: data.groceryTotal,
          expenseTotal: data.expenseTotal || 0,
          combinedTotal: data.combinedTotal,
          filename: `shift_${data.date.replace(/[: ]/g, "_")}.html`,
          timestamp: Date.now(),
          billiardRows: data.billiardRows,
          groceryRows: data.groceryRows,
          expenseRows: data.expenseRows || [],
        }

        history.push(historyItem)
        try {
          localStorage.setItem("popsey_shift_history", JSON.stringify(history))
        } catch (error) {
          console.error("Error saving shift history:", error)
        }

        // Save to Firebase immediately
        saveHistoryToFirebase(historyItem)
        return historyItem
      } catch (error) {
        console.error("Error in saveShiftHistory:", error)
        return null
      }
    }

    function exportToPDF(data, filename) {
  try {
    console.log("Generating PDF export...")

    // Generate HTML content
    const htmlContent = generatePDFHTML(data)

    // Check if the browser supports the File System Access API
    if ('showSaveFilePicker' in window) {
      // Modern browsers - show save dialog
      showSaveDialog(htmlContent, filename.replace(".pdf", ".html"))
    } else {
      // Fallback for older browsers - regular download
      const blob = new Blob([htmlContent], { type: "text/html" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = filename.replace(".pdf", ".html")
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    console.log("PDF export completed")
  } catch (error) {
    console.error("Error exporting to PDF:", error)
    alert("Error generating PDF export. Please try again.")
  }
}

// New function to handle the save dialog
async function showSaveDialog(content, suggestedName) {
  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: suggestedName,
      types: [
        {
          description: 'HTML files',
          accept: {
            'text/html': ['.html'],
          },
        },
      ],
    })

    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()

    alert('File saved successfully!')
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error saving file:', error)
      alert('Error saving file. Please try again.')
    }
    // If user cancels, do nothing (AbortError)
  }
}

    // --- Enhanced PDF Generation with Better Styling ---
    function generatePDFHTML(data) {
      try {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>POPSEY System - Shift Report</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
              background: #fff;
              padding: 20px;
              color: #222b3a;
              line-height: 1.6;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding: 25px;
              background: linear-gradient(135deg, #43cea2 0%, #185a9d 100%);
              color: white;
              border-radius: 12px;
              box-shadow: 0 4px 15px rgba(67, 206, 162, 0.3);
            }
            
            .header h1 {
              font-size: 32px;
              margin-bottom: 10px;
              font-weight: 700;
            }
            
            .header p {
              font-size: 16px;
              opacity: 0.9;
              margin: 5px 0;
            }
            
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin-bottom: 40px;
            }
            
            .summary-card {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              padding: 25px;
              border-radius: 12px;
              text-align: center;
              border: 1px solid #dee2e6;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              transition: transform 0.2s ease;
            }
            
            .summary-card:hover {
              transform: translateY(-2px);
            }
            
            .summary-card .label {
              font-size: 14px;
              color: #6c757d;
              margin-bottom: 10px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .summary-card .value {
              font-size: 28px;
              font-weight: 700;
              color: #43cea2;
            }
            
            .section {
              background: #fff;
              margin-bottom: 30px;
              border-radius: 12px;
              border: 1px solid #dee2e6;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .section-header {
              background: linear-gradient(135deg, #43cea2 0%, #185a9d 100%);
              color: #fff;
              padding: 20px 25px;
              font-size: 20px;
              font-weight: 600;
            }
            
            .section-content {
              padding: 25px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            
            th, td {
              padding: 15px 12px;
              text-align: left;
              border-bottom: 1px solid #dee2e6;
            }
            
            th {
              background: #f8f9fa;
              font-weight: 600;
              color: #495057;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            tr:hover {
              background: #f8f9fa;
            }
            
            .status-paid {
              color: #28a745;
              font-weight: bold;
              background: #d4edda;
              border-radius: 6px;
              padding: 4px 8px;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            .status-unpaid {
              color: #dc3545;
              font-weight: bold;
              background: #f8d7da;
              border-radius: 6px;
              padding: 4px 8px;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            .no-data {
              text-align: center;
              color: #6c757d;
              font-style: italic;
              padding: 60px;
              font-size: 16px;
            }
            
            .download-info {
              background: #e3f2fd;
              border: 1px solid #2196f3;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
              color: #1976d2;
              text-align: center;
            }
            
            @media print {
              body {
                background: #fff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .section {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              
              .header {
                break-after: avoid;
                page-break-after: avoid;
              }
              
              .download-info {
                display: none;
              }
            }
            
            @media (max-width: 768px) {
              body {
                padding: 10px;
              }
              
              .summary-cards {
                grid-template-columns: 1fr;
              }
              
              table {
                font-size: 14px;
              }
              
              th, td {
                padding: 10px 8px;
              }
            }
          </style>
        </head>
        <body>
          <div class="download-info">
            <strong>💡 Tip:</strong> Use Ctrl+P (Cmd+P on Mac) to print this report as a PDF, or use your browser's "Save as PDF" option.
          </div>
          
          <div class="header">
            <h1>🎱 POPSEY System - Shift Report</h1>
            <p><strong>📅 Shift Date:</strong> ${data.date}</p>
            <p><strong>⏰ Shift Started:</strong> ${data.shiftStartTime}</p>
            <p><strong>🕒 Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary-cards">
            <div class="summary-card">
              <div class="label">🎱 Billiard Revenue</div>
              <div class="value">₱${data.billiardPaid.toFixed(2)}</div>
            </div>
            <div class="summary-card">
              <div class="label">🛒 Grocery Revenue</div>
              <div class="value">₱${data.groceryTotal.toFixed(2)}</div>
            </div>
            <div class="summary-card">
              <div class="label">💰 Total Expenses</div>
              <div class="value">₱${(data.expenseTotal || 0).toFixed(2)}</div>
            </div>
            <div class="summary-card">
              <div class="label">💵 Total Revenue</div>
              <div class="value">₱${data.combinedTotal.toFixed(2)}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-header">🎱 Billiard Transactions</div>
            <div class="section-content">
              ${
                data.billiardRows && data.billiardRows.length > 0
                  ? `
                <table>
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Table Type</th>
                      <th>Mode</th>
                      <th>Rate/Game</th>
                      <th>Games</th>
                      <th>Total Due</th>
                      <th>Amount Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.billiardRows
                      .map(
                        (row) => `
                      <tr>
                        <td>${row.name || "Walk-in Customer"}</td>
                        <td><strong>${row.tableType.toUpperCase()}</strong></td>
                        <td>${row.mode.charAt(0).toUpperCase() + row.mode.slice(1)}</td>
                        <td>₱${row.amount.toFixed(2)}</td>
                        <td><strong>${row.games}</strong></td>
                        <td>₱${row.total.toFixed(2)}</td>
                        <td>₱${row.paid.toFixed(2)}</td>
                        <td>₱${row.balance.toFixed(2)}</td>
                        <td><span class="status-${row.status.toLowerCase()}">${row.status}</span></td>
                        <td>${row.isActive ? "🟢 Active" : "✅ Done"}</td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              `
                  : '<div class="no-data">📝 No billiard transactions recorded for this shift</div>'
              }
            </div>
          </div>
          
          <div class="section">
            <div class="section-header">🛒 Grocery Transactions</div>
            <div class="section-content">
              ${
                data.groceryRows && data.groceryRows.length > 0
                  ? `
                <table>
                  <thead>
                    <tr>
                      <th>Table/Customer</th>
                      <th>Item</th>
                      <th>Price/Item</th>
                      <th>Quantity</th>
                      <th>Total Items</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.groceryRows
                      .map(
                        (row) => `
                      <tr>
                        <td>${row.tableName || "Direct Purchase"}</td>
                        <td>${row.item || "N/A"}</td>
                        <td>₱${row.amount.toFixed(2)}</td>
                        <td><strong>${row.purchases}</strong></td>
                        <td>${row.totalItems}</td>
                        <td>₱${row.total.toFixed(2)}</td>
                        <td><span class="status-${row.status.toLowerCase()}">${row.status}</span></td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              `
                  : '<div class="no-data">📝 No grocery transactions recorded for this shift</div>'
              }
            </div>
          </div>
          
          <div class="section">
            <div class="section-header">💰 Expense Transactions</div>
            <div class="section-content">
              ${
                data.expenseRows && data.expenseRows.length > 0
                  ? `
                <table>
                  <thead>
                    <tr>
                      <th>Expense Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.expenseRows
                      .map(
                        (row) => `
                      <tr>
                        <td>${row.expense}</td>
                        <td><strong>₱${row.amount.toFixed(2)}</strong></td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              `
                  : '<div class="no-data">📝 No expense transactions recorded for this shift</div>'
              }
            </div>
          </div>
          
          <div class="section">
            <div class="section-header">📊 Shift Summary</div>
            <div class="section-content">
              <table>
                <tbody>
                  <tr>
                    <td><strong>⏰ Shift Started:</strong></td>
                    <td><strong>${data.shiftStartTime}</strong></td>
                  </tr>
                  <tr>
                    <td><strong>📊 Total Billiard Transactions:</strong></td>
                    <td><strong>${data.billiardRows ? data.billiardRows.length : 0}</strong></td>
                  </tr>
                  <tr>
                    <td><strong>🛒 Total Grocery Transactions:</strong></td>
                    <td><strong>${data.groceryRows ? data.groceryRows.length : 0}</strong></td>
                  </tr>
                  <tr>
                    <td><strong>💰 Total Expense Transactions:</strong></td>
                    <td><strong>${data.expenseRows ? data.expenseRows.length : 0}</strong></td>
                  </tr>
                  <tr style="background: #f8f9fa;">
                    <td><strong>🎱 Billiard Revenue:</strong></td>
                    <td><strong>₱${data.billiardPaid.toFixed(2)}</strong></td>
                  </tr>
                  <tr style="background: #f8f9fa;">
                    <td><strong>🛒 Grocery Revenue:</strong></td>
                    <td><strong>₱${data.groceryTotal.toFixed(2)}</strong></td>
                  </tr>
                  <tr style="background: #f8f9fa;">
                    <td><strong>💰 Total Expenses:</strong></td>
                    <td><strong>₱${(data.expenseTotal || 0).toFixed(2)}</strong></td>
                  </tr>
                  <tr style="border-top: 3px solid #43cea2; background: #e8f5e8; font-size: 18px;">
                    <td><strong>💵 NET REVENUE:</strong></td>
                    <td><strong style="color: #28a745;">₱${data.combinedTotal.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <p style="color: #6c757d; font-size: 14px;">
              Report generated by POPSEY System on ${new Date().toLocaleString()}
            </p>
          </div>
        </body>
        </html>
      `
      } catch (error) {
        console.error("Error generating PDF HTML:", error)
        return "<html><body><h1>Error generating report</h1></body></html>"
      }
    }

    function resetAllTables() {
      try {
        // Clear all tables completely (no default rows)
        clearAllTables()

        // Clear localStorage state as well
        localStorage.removeItem("popsey_complete_state")

        // Trigger immediate save to update dashboard and Firebase
        triggerAutoSave("reset_tables", true)

        console.log("All tables reset to empty state")
      } catch (error) {
        console.error("Error resetting tables:", error)
      }
    }

    // --- ENHANCED: Firebase Real-time Synchronization ---
    function initializeFirebaseSync() {
      try {
        if (!firebaseInitialized || !database) return

        console.log("Setting up real-time Firebase synchronization...")

        // Listen for real-time updates to complete state with improved deletion detection
        database.ref("popsey/complete_state").on("value", (snapshot) => {
          try {
            if (isFirebaseSyncPaused || isInitialLoad) return

            const remoteState = snapshot.val()
            if (remoteState && remoteState.timestamp) {
              const localState = localStorage.getItem("popsey_complete_state")
              let shouldUpdate = false

              if (!localState) {
                shouldUpdate = true
                console.log("No local data found, syncing from Firebase...")
              } else {
                const localData = JSON.parse(localState)
                const timeDiff = remoteState.timestamp - (localData.timestamp || 0)

                // Check for deletions (remote has fewer rows)
                const remoteTotal =
                  remoteState.billiardRowsCount + remoteState.groceryRowsCount + remoteState.expenseRowsCount
                const localTotal = localData.billiardRowsCount + localData.groceryRowsCount + localData.expenseRowsCount
                const hasFewerRows = remoteTotal < localTotal

                // Update if: newer timestamp AND (has more/equal data OR has fewer rows indicating deletion)
                shouldUpdate =
                  timeDiff > 1000 &&
                  remoteState.timestamp > lastSaveTimestamp &&
                  (remoteTotal >= localTotal || hasFewerRows)

                if (shouldUpdate) {
                  const action = hasFewerRows ? "deletion" : "addition/update"
                  console.log(`Remote ${action} detected (${timeDiff}ms newer), syncing...`)
                }
              }

              if (shouldUpdate) {
                console.log("Syncing remote data to local...")
                localStorage.setItem("popsey_complete_state", JSON.stringify(remoteState))

                isFirebaseSyncPaused = true
                loadCompleteStateFromData(remoteState)

                setTimeout(() => {
                  isFirebaseSyncPaused = false
                }, 1500) // Reduced delay for faster sync
              }
            }
          } catch (error) {
            console.error("Error processing Firebase sync:", error)
            isFirebaseSyncPaused = false
          }
        })

        console.log("Real-time synchronization enabled")
      } catch (error) {
        console.error("Error setting up Firebase sync:", error)
      }
    }

    function loadCompleteStateFromData(state) {
      try {
        console.log("Loading state from Firebase sync...")
        console.log(
          `Remote state: ${state.billiardRowsCount || 0} billiard, ${state.groceryRowsCount || 0} grocery, ${state.expenseRowsCount || 0} expense rows`,
        )

        // Load shift start time
        if (state.shiftStartTime) {
          shiftStartTime = state.shiftStartTime
          updateShiftStartDisplay()
        }

        // Clear existing tables
        clearAllTables()

        // Restore data without triggering saves
        if (state.billiardRows && state.billiardRows.length > 0) {
          console.log(`Restoring ${state.billiardRows.length} billiard rows...`)
          state.billiardRows.forEach((rowData) => {
            const tr = createBilliardRowFromData(rowData)
            const tbody = document.getElementById("billiardTbody")
            if (tbody && tr) {
              tbody.appendChild(tr)
              billiardRows.push(tr)
            }
          })
        }

        if (state.groceryRows && state.groceryRows.length > 0) {
          console.log(`Restoring ${state.groceryRows.length} grocery rows...`)
          state.groceryRows.forEach((rowData) => {
            const tr = createGroceryRowFromData(rowData)
            const tbody = document.getElementById("groceryTbody")
            if (tbody && tr) {
              tbody.appendChild(tr)
              groceryRows.push(tr)
            }
          })
        }

        if (state.expenseRows && state.expenseRows.length > 0) {
          console.log(`Restoring ${state.expenseRows.length} expense rows...`)
          state.expenseRows.forEach((rowData) => {
            const tr = createExpenseRowFromData(rowData)
            const tbody = document.getElementById("expenseTbody")
            if (tbody && tr) {
              tbody.appendChild(tr)
              expenseRows.push(tr)
            }
          })
        }

        if (state.recallData) {
          groceryRecallTableNames = state.recallData.tableNames || []
          groceryRecallItems = state.recallData.items || []
        }

        // Update dashboard without triggering save
        const billiardPaidEl = document.getElementById("dashboard-billiard-paid")
        const groceryTotalEl = document.getElementById("dashboard-grocery-total")
        const expenseTotalEl = document.getElementById("dashboard-expense-total")
        const combinedTotalEl = document.getElementById("dashboard-combined-total")

        if (billiardPaidEl) billiardPaidEl.textContent = (state.billiardPaid || 0).toFixed(2)
        if (groceryTotalEl) groceryTotalEl.textContent = (state.groceryTotal || 0).toFixed(2)
        if (expenseTotalEl) expenseTotalEl.textContent = (state.expenseTotal || 0).toFixed(2)
        if (combinedTotalEl) combinedTotalEl.textContent = (state.combinedTotal || 0).toFixed(2)

        filterBilliardRows()
        updateBilliardTotal()
        updateGroceryTotal()
        console.log(
          `Firebase sync completed: ${billiardRows.length} billiard, ${groceryRows.length} grocery, ${expenseRows.length} expense rows restored`,
        )
      } catch (error) {
        console.error("Error loading state from Firebase sync:", error)
      }
    }

    // Global functions for onclick handlers
    window.deleteHistoryItem = (id) => {
      try {
        if (!window.confirm("Are you sure you want to delete this history item?")) return

        let history = []
        try {
          history = JSON.parse(localStorage.getItem("popsey_shift_history")) || []
        } catch {}

        history = history.filter((item) => item.id != id)
        try {
          localStorage.setItem("popsey_shift_history", JSON.stringify(history))
        } catch (error) {
          console.error("Error updating history:", error)
        }

        // Remove from Firebase if available
        if (isOnline && firebaseInitialized && database) {
          try {
            database
              .ref(`popsey/shift_history/${id}`)
              .remove()
              .then(() => console.log("History item deleted from Firebase:", id))
              .catch((error) => console.error("Error removing from Firebase:", error))
          } catch (error) {
            console.error("Error removing from Firebase:", error)
          }
        }

        loadShiftHistoryTable()
      } catch (error) {
        console.error("Error deleting history item:", error)
      }
    }

    window.reExportShift = (id) => {
      try {
        let history = []
        try {
          history = JSON.parse(localStorage.getItem("popsey_shift_history")) || []
        } catch {}

        const historyItem = history.find((item) => item.id == id)
        if (historyItem) {
          // Create export data object
          const exportData = {
            date: historyItem.date,
            shiftStartTime: historyItem.shiftStartTime || "Start shift not reported",
            billiardPaid: historyItem.billiardPaid,
            groceryTotal: historyItem.groceryTotal,
            expenseTotal: historyItem.expenseTotal || 0,
            combinedTotal: historyItem.combinedTotal,
            billiardRows: historyItem.billiardRows || [],
            groceryRows: historyItem.groceryRows || [],
            expenseRows: historyItem.expenseRows || [],
          }
          exportToPDF(exportData, historyItem.filename)
        }
      } catch (error) {
        console.error("Error re-exporting shift:", error)
      }
    }

    window.openHistoryDetail = (id) => {
      try {
        let history = []
        try {
          history = JSON.parse(localStorage.getItem("popsey_shift_history")) || []
        } catch {}

        const historyItem = history.find((item) => item.id == id)
        if (!historyItem) {
          alert("History item not found!")
          return
        }

        // Create new window
        const newWindow = window.open("", "_blank", "width=1200,height=800,scrollbars=yes,resizable=yes")

        // Generate HTML content for the new window
        const htmlContent = generatePDFHTML(historyItem)
        newWindow.document.write(htmlContent)
        newWindow.document.close()
      } catch (error) {
        console.error("Error opening history detail:", error)
      }
    }

    // Initialize when DOM is ready
    function startApplication() {
      try {
        // Set up authentication listeners first
        setupAuthenticationListeners()

        // Check login status
        const isLoggedIn = checkLoginStatus()

        // If logged in, initialize the main application
        if (isLoggedIn) {
          initializePage()
        }
      } catch (error) {
        console.error("Critical error in application startup:", error)
        alert("There was an error loading the application. Please refresh the page and try again.")
      }
    }

    // Start the application
    try {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startApplication)
      } else {
        startApplication()
      }
    } catch (error) {
      console.error("Critical error in script initialization:", error)
      alert("There was an error loading the application. Please refresh the page and try again.")
    }
  } catch (error) {
    console.error("Critical error in script initialization:", error)
    alert("There was an error loading the application. Please refresh the page and try again.")
  }
})()
