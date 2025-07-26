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

    // Firebase variables - will be initialized later
    let database = null
    let storage = null
    let firebaseInitialized = false

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

    // --- Enhanced Auto-Save System ---
    function triggerAutoSave(action = "data_change") {
      try {
        // Save immediately instead of using timeout
        updateDashboardValues()
        updateLastSaveTime()
        console.log(`Auto-saved: ${action}`)
      } catch (error) {
        console.error("Error in triggerAutoSave:", error)
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

    function saveCompleteState() {
      try {
        const completeState = {
          date: getTodayDate(),
          timestamp: Date.now(),
          billiardPaid: Number.parseFloat(document.getElementById("dashboard-billiard-paid")?.textContent || "0") || 0,
          groceryTotal: Number.parseFloat(document.getElementById("dashboard-grocery-total")?.textContent || "0") || 0,
          expenseTotal: Number.parseFloat(document.getElementById("dashboard-expense-total")?.textContent || "0") || 0,
          combinedTotal:
            Number.parseFloat(document.getElementById("dashboard-combined-total")?.textContent || "0") || 0,
          billiardRows: collectBilliardData(),
          groceryRows: collectGroceryData(),
          expenseRows: collectExpenseData(),
          billiardRowsCount: document.querySelectorAll("#billiardTbody tr").length,
          groceryRowsCount: document.querySelectorAll("#groceryTbody tr").length,
          expenseRowsCount: document.querySelectorAll("#expenseTbody tr").length,
          recallData: {
            tableNames: groceryRecallTableNames,
            items: groceryRecallItems,
          },
        }

        // Save locally immediately
        try {
          localStorage.setItem("popsey_complete_state", JSON.stringify(completeState))
          console.log(
            `State saved locally: ${completeState.billiardRowsCount} billiard rows, ${completeState.groceryRowsCount} grocery rows, ${completeState.expenseRowsCount} expense rows`,
          )
        } catch (error) {
          console.error("Error saving to localStorage:", error)
        }

        // Save to Firebase if available
        saveToFirebase("complete_state", completeState)

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

          // Clear existing tables
          document.querySelectorAll("#billiardTbody tr").forEach((tr) => tr.remove())
          document.querySelectorAll("#groceryTbody tr").forEach((tr) => tr.remove())
          document.querySelectorAll("#expenseTbody tr").forEach((tr) => tr.remove())
          billiardRows = []
          groceryRows = []
          expenseRows = []

          // Restore billiard rows
          if (state.billiardRows && state.billiardRows.length > 0) {
            state.billiardRows.forEach((rowData) => {
              const tr = createBilliardRowFromData(rowData)
              const tbody = document.getElementById("billiardTbody")
              if (tbody && tr) {
                tbody.appendChild(tr)
                billiardRows.push(tr)
              }
            })
          } else {
            // Add default row if no saved rows
            addBilliardRowSilent()
          }

          // Restore grocery rows
          if (state.groceryRows && state.groceryRows.length > 0) {
            state.groceryRows.forEach((rowData) => {
              const tr = createGroceryRowFromData(rowData)
              const tbody = document.getElementById("groceryTbody")
              if (tbody && tr) {
                tbody.appendChild(tr)
                groceryRows.push(tr)
              }
            })
          } else {
            // Add default row if no saved rows
            addGroceryRowSilent()
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

          // Update dashboard
          updateDashboardValues()
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
        tr._paidHistory = data.paidHistory || []
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

    function saveHistoryToFirebase(historyItem) {
      try {
        if (isOnline && firebaseInitialized && database) {
          database
            .ref("popsey/shift_history")
            .push(historyItem)
            .then(() => console.log("History saved to Firebase"))
            .catch((error) => console.error("Firebase history save error:", error))
        } else if (!firebaseInitialized) {
          console.log("Firebase not available - history saved locally only")
        } else {
          addToSyncQueue("save_history", historyItem)
        }
      } catch (error) {
        console.error("Error in saveHistoryToFirebase:", error)
      }
    }

    function uploadFileToFirebase(filename, content) {
      try {
        if (isOnline && firebaseInitialized && storage) {
          const storageRef = storage.ref(`exports/${filename}`)
          const blob = new Blob([content], { type: "text/csv" })
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

        // If no saved data, initialize with default rows
        if (!hasLoadedData) {
          console.log("No saved data found, initializing with default rows")
          // Initialize existing rows if they exist in HTML
          document.querySelectorAll("#billiardTbody tr").forEach((tr) => {
            if (!tr.querySelector(".delete-row-btn")) {
              const td = tr.querySelector("td:last-child")
              if (td) {
                const btn = document.createElement("button")
                btn.className = "delete-row-btn"
                btn.textContent = "Delete"
                btn.title = "Delete Row"
                td.appendChild(btn)
              }
            }
            attachBilliardRowEvents(tr)
            updateBilliardRow(tr)
            billiardRows.push(tr)
          })

          document.querySelectorAll("#groceryTbody tr").forEach((tr) => {
            attachGroceryRowEvents(tr)
            updateGroceryRow(tr)
            groceryRows.push(tr)
          })

          document.querySelectorAll("#expenseTbody tr").forEach((tr) => {
            attachExpenseRowEvents(tr)
            expenseRows.push(tr)
          })

          filterBilliardRows()
        }

        // Set up tab switching
        setupTabSwitching()

        // Set up all event listeners
        setupEventListeners()

        // Start live clock
        startLiveClock()

        // Initial dashboard update and history load
        updateDashboardValues()
        loadShiftHistoryTable()

        console.log("Page initialization complete")
      } catch (error) {
        console.error("Error in page initialization:", error)
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

        // Trigger auto-save
        triggerAutoSave("billiard_update")
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
            triggerAutoSave("billiard_table_change")
          })
        }

        // Name input change
        const nameEl = row.querySelector(".name")
        if (nameEl) {
          nameEl.addEventListener("input", () => {
            triggerAutoSave("billiard_name_change")
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
              triggerAutoSave("billiard_mode_change")
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
              triggerAutoSave("billiard_add_game")
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
              triggerAutoSave("billiard_delete_game")
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
                triggerAutoSave("billiard_add_payment")
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
                  triggerAutoSave("billiard_delete_payment")
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
            triggerAutoSave("billiard_toggle_active")
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
        triggerAutoSave("add_billiard_row")
        console.log(`Billiard row added. Total rows: ${billiardRows.length}`)
      } catch (error) {
        console.error("Error adding billiard row:", error)
      }
    }

    function addBilliardRowSilent() {
      try {
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
        tbody.appendChild(tr)
        attachBilliardRowEvents(tr)
        updateBilliardRow(tr)
        billiardRows.push(tr)
        filterBilliardRows()
      } catch (error) {
        console.error("Error adding billiard row silently:", error)
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
              triggerAutoSave("grocery_status_change")
            })
          }
        }

        // Trigger auto-save
        triggerAutoSave("grocery_update")

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
            triggerAutoSave("grocery_amount_change")
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
            triggerAutoSave("grocery_table_change")
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
            triggerAutoSave("grocery_item_change")
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
              triggerAutoSave("grocery_add_purchase")
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
              triggerAutoSave("grocery_delete_purchase")
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

    // Add Grocery Row function with delete row button
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
        tbody.appendChild(tr)
        tr._purchases = 0
        tr._status = "Unpaid"
        attachGroceryRowEvents(tr)
        updateGroceryRow(tr)
        groceryRows.push(tr)

        // IMMEDIATE SAVE after adding row
        triggerAutoSave("add_grocery_row")
        console.log(`Grocery row added. Total rows: ${groceryRows.length}`)
      } catch (error) {
        console.error("Error adding grocery row:", error)
      }
    }

    function addGroceryRowSilent() {
      try {
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
        tbody.appendChild(tr)
        tr._purchases = 0
        tr._status = "Unpaid"
        attachGroceryRowEvents(tr)
        updateGroceryRow(tr)
        groceryRows.push(tr)
      } catch (error) {
        console.error("Error adding grocery row silently:", error)
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

        // Hide modal and trigger save
        hideExpenseModal()
        triggerAutoSave("add_expense_row")
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

        // Hide modal and trigger save
        hideEditExpenseModal()
        triggerAutoSave("update_expense_row")
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

        // Delete button
        const deleteBtn = row.querySelector(".expense-delete-btn")
        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => {
            if (window.confirm("Are you sure you want to delete this expense?")) {
              row.remove()
              expenseRows = expenseRows.filter((r) => r !== row)
              triggerAutoSave("delete_expense_row")
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

        // Save complete state automatically
        saveCompleteState()
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

    // --- Event Listeners Setup ---
    function setupEventListeners() {
      try {
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

        // Row delete logic with confirm and delay
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
                  triggerAutoSave("delete_billiard_row")
                }
                setTimeout(() => {
                  delRowLocked = false
                }, 350)
              }
            }
          })
        }

        // Add row button event for groceries
        const addGroceryRowBtn = document.getElementById("addGroceryRow")
        if (addGroceryRowBtn) {
          addGroceryRowBtn.addEventListener("click", addGroceryRow)
        }

        // Grocery row delete logic with confirm and delay
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
                  triggerAutoSave("delete_grocery_row")
                }
                setTimeout(() => {
                  delGroceryRowLocked = false
                }, 350)
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
              billiardPaid: Number.parseFloat(document.getElementById("dashboard-billiard-paid")?.textContent) || 0,
              groceryTotal: Number.parseFloat(document.getElementById("dashboard-grocery-total")?.textContent) || 0,
              expenseTotal: Number.parseFloat(document.getElementById("dashboard-expense-total")?.textContent) || 0,
              combinedTotal: Number.parseFloat(document.getElementById("dashboard-combined-total")?.textContent) || 0, // This will now be billiard + grocery only
              billiardRows: collectBilliardData(),
              groceryRows: collectGroceryData(),
              expenseRows: collectExpenseData(),
            }

            const filename = `current_data_${currentData.date.replace(/[: ]/g, "_")}.csv`
            exportToExcel(currentData, filename)
          })
        }

        // End shift button
        const endShiftBtn = document.getElementById("endShiftBtn")
        if (endShiftBtn) {
          endShiftBtn.addEventListener("click", () => {
            if (!window.confirm("End shift and reset all tables? This will export current data and clear all entries."))
              return

            // Get current data for export and history
            const currentData = {
              date: getTodayDate(),
              billiardPaid: Number.parseFloat(document.getElementById("dashboard-billiard-paid")?.textContent) || 0,
              groceryTotal: Number.parseFloat(document.getElementById("dashboard-grocery-total")?.textContent) || 0,
              expenseTotal: Number.parseFloat(document.getElementById("dashboard-expense-total")?.textContent) || 0,
              combinedTotal: Number.parseFloat(document.getElementById("dashboard-combined-total")?.textContent) || 0, // This will now be billiard + grocery only
              billiardRows: collectBilliardData(),
              groceryRows: collectGroceryData(),
              expenseRows: collectExpenseData(),
            }

            // Export to Excel
            const filename = `shift_end_${currentData.date.replace(/[: ]/g, "_")}.csv`
            exportToExcel(currentData, filename)

            // Save to history
            saveShiftHistory(currentData)

            // Reset tables
            resetAllTables()

            // Reload history table
            loadShiftHistoryTable()

            alert("Shift ended successfully! Data exported and tables reset.")
          })
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
          tr.innerHTML = `<td colspan="6" style="padding:20px; text-align:center; color:#888; font-style:italic;">No shift history available</td>`
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
          billiardPaid: data.billiardPaid,
          groceryTotal: data.groceryTotal,
          expenseTotal: data.expenseTotal || 0,
          combinedTotal: data.combinedTotal,
          filename: `shift_${data.date.replace(/[: ]/g, "_")}.csv`,
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

        // Save to Firebase
        saveHistoryToFirebase(historyItem)

        return historyItem
      } catch (error) {
        console.error("Error in saveShiftHistory:", error)
        return null
      }
    }

    function exportToExcel(data, filename) {
      try {
        const csv = generateComprehensiveExcel(data)
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        // Upload to Firebase Storage
        uploadFileToFirebase(filename, csv)
      } catch (error) {
        console.error("Error exporting to Excel:", error)
      }
    }

    function generateComprehensiveExcel(data) {
      try {
        let csv = "POPSEY SYSTEM - COMPREHENSIVE REPORT\n"
        csv += `Generated: ${data.date}\n`
        csv += `Billiard Total Paid: ${data.billiardPaid.toFixed(2)}\n`
        csv += `Grocery Total: ${data.groceryTotal.toFixed(2)}\n`
        csv += `Expense Total: ${(data.expenseTotal || 0).toFixed(2)}\n`
        csv += `Combined Total: ${data.combinedTotal.toFixed(2)}\n\n`

        // Billiard Section
        csv += "=== BILLIARD TRANSACTIONS ===\n"
        csv +=
          "Name,Table Type,Mode,Amount per Game,Number of Games,Total Amount,Total Paid,Balance,Status,Active/Done,Paid History\n"

        data.billiardRows.forEach((row) => {
          const paidHistoryStr = row.paidHistory ? row.paidHistory.join("; ") : ""
          csv += `"${row.name}","${row.tableType}","${row.mode}",${row.amount},${row.games},${row.total},${row.paid},${row.balance},"${row.status}","${row.isActive ? "Active" : "Done"}","${paidHistoryStr}"\n`
        })

        csv += "\n=== GROCERY TRANSACTIONS ===\n"
        csv += "Table/Name,Item,Amount per Item,Number of Purchases,Total Items,Total Amount,Status\n"

        data.groceryRows.forEach((row) => {
          csv += `"${row.tableName}","${row.item}",${row.amount},${row.purchases},${row.totalItems},${row.total}","${row.status}"\n`
        })

        // Expense Section
        csv += "\n=== EXPENSE TRANSACTIONS ===\n"
        csv += "Expense,Amount\n"

        if (data.expenseRows && data.expenseRows.length > 0) {
          data.expenseRows.forEach((row) => {
            csv += `"${row.expense}",${row.amount.toFixed(2)}\n`
          })
        }

        // Summary Section
        csv += "\n=== SUMMARY ===\n"
        csv += "Category,Amount\n"
        csv += `Billiard Total Paid,${data.billiardPaid.toFixed(2)}\n`
        csv += `Grocery Total,${data.groceryTotal.toFixed(2)}\n`
        csv += `Expense Total,${(data.expenseTotal || 0).toFixed(2)}\n`
        csv += `Combined Total,${data.combinedTotal.toFixed(2)}\n`

        return csv
      } catch (error) {
        console.error("Error generating comprehensive Excel:", error)
        return ""
      }
    }

    function resetAllTables() {
      try {
        document.querySelectorAll("#billiardTbody tr").forEach((tr) => tr.remove())
        document.querySelectorAll("#groceryTbody tr").forEach((tr) => tr.remove())
        document.querySelectorAll("#expenseTbody tr").forEach((tr) => tr.remove())
        billiardRows = []
        groceryRows = []
        expenseRows = []
        addBilliardRow()
        addGroceryRow()
        triggerAutoSave("reset_tables")
      } catch (error) {
        console.error("Error resetting tables:", error)
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
            database.ref("popsey/shift_history").once("value", (snapshot) => {
              const firebaseHistory = snapshot.val()
              if (firebaseHistory) {
                Object.keys(firebaseHistory).forEach((key) => {
                  if (firebaseHistory[key].id == id) {
                    database.ref(`popsey/shift_history/${key}`).remove()
                  }
                })
              }
            })
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
            billiardPaid: historyItem.billiardPaid,
            groceryTotal: historyItem.groceryTotal,
            expenseTotal: historyItem.expenseTotal || 0,
            combinedTotal: historyItem.combinedTotal,
            billiardRows: historyItem.billiardRows || [],
            groceryRows: historyItem.groceryRows || [],
            expenseRows: historyItem.expenseRows || [],
          }

          exportToExcel(exportData, historyItem.filename)
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
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>POPSEY System - Shift Details</title>
            <style>
              body {
                font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
                background: #f4f7fa;
                margin: 0;
                padding: 20px;
                color: #222b3a;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: #fff;
                border-radius: 10px;
                box-shadow: 0 2px 8px rgba(26,35,50,0.08);
              }
              .header h1 {
                color: #43cea2;
                margin: 0 0 10px 0;
                font-size: 28px;
              }
              .header p {
                margin: 5px 0;
                font-size: 16px;
              }
              .summary-cards {
                display: flex;
                gap: 20px;
                justify-content: center;
                margin-bottom: 30px;
                flex-wrap: wrap;
              }
              .summary-card {
                background: #fff;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 8px rgba(26,35,50,0.08);
                text-align: center;
                min-width: 200px;
              }
              .summary-card .label {
                font-size: 14px;
                color: #888;
                margin-bottom: 8px;
              }
              .summary-card .value {
                font-size: 24px;
                font-weight: 700;
                color: #43cea2;
              }
              .section {
                background: #fff;
                margin-bottom: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 8px rgba(26,35,50,0.08);
                overflow: hidden;
              }
              .section-header {
                background: #43cea2;
                color: #fff;
                padding: 15px 20px;
                font-size: 18px;
                font-weight: 600;
              }
              .section-content {
                padding: 20px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              th, td {
                padding: 12px 8px;
                text-align: left;
                border-bottom: 1px solid #e3e7ed;
              }
              th {
                background: #f8f9fa;
                font-weight: 600;
                color: #222b3a;
              }
              .status-paid {
                color: #43cea2;
                font-weight: bold;
                background: #eafaf6;
                border-radius: 4px;
                padding: 2px 6px;
              }
              .status-unpaid {
                color: #dc3545;
                font-weight: bold;
                background: #fdeaea;
                border-radius: 4px;
                padding: 2px 6px;
              }
              .no-data {
                text-align: center;
                color: #888;
                font-style: italic;
                padding: 40px;
              }
              .print-btn {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                background: #43cea2;
                color: #fff;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: 600;
              }
              .print-btn:hover {
                background: #369870;
              }
              @media print {
                .print-btn { display: none; }
                body { background: #fff; }
                .section { box-shadow: none; border: 1px solid #ddd; }
              }
            </style>
          </head>
          <body>
            <button class="print-btn" onclick="window.print()">Print Report</button>
            
            <div class="header">
              <h1>POPSEY System - Shift Report</h1>
              <p><strong>Date:</strong> ${historyItem.date}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="summary-cards">
              <div class="summary-card">
                <div class="label">Billiard Total Paid</div>
                <div class="value">₱${historyItem.billiardPaid.toFixed(2)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Grocery Total</div>
                <div class="value">₱${historyItem.groceryTotal.toFixed(2)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Expense Total</div>
                <div class="value">₱${(historyItem.expenseTotal || 0).toFixed(2)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Combined Total</div>
                <div class="value">₱${historyItem.combinedTotal.toFixed(2)}</div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-header">📊 Billiard Transactions</div>
              <div class="section-content">
                ${
                  historyItem.billiardRows && historyItem.billiardRows.length > 0
                    ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Table Type</th>
                        <th>Mode</th>
                        <th>Amount/Game</th>
                        <th>Games</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${historyItem.billiardRows
                        .map(
                          (row) => `
                        <tr>
                          <td>${row.name || "N/A"}</td>
                          <td>${row.tableType.toUpperCase()}</td>
                          <td>${row.mode.charAt(0).toUpperCase() + row.mode.slice(1)}</td>
                          <td>₱${row.amount.toFixed(2)}</td>
                          <td>${row.games}</td>
                          <td>₱${row.total.toFixed(2)}</td>
                          <td>₱${row.paid.toFixed(2)}</td>
                          <td>₱${row.balance.toFixed(2)}</td>
                          <td><span class="status-${row.status.toLowerCase()}">${row.status}</span></td>
                          <td>${row.isActive ? "Active" : "Done"}</td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </tbody>
                  </table>
                `
                    : '<div class="no-data">No billiard transactions recorded</div>'
                }
              </div>
            </div>
            
            <div class="section">
              <div class="section-header">🛒 Grocery Transactions</div>
              <div class="section-content">
                ${
                  historyItem.groceryRows && historyItem.groceryRows.length > 0
                    ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Table/Name</th>
                        <th>Item</th>
                        <th>Amount/Item</th>
                        <th>Purchases</th>
                        <th>Total Items</th>
                        <th>Total Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${historyItem.groceryRows
                        .map(
                          (row) => `
                        <tr>
                          <td>${row.tableName || "N/A"}</td>
                          <td>${row.item || "N/A"}</td>
                          <td>₱${row.amount.toFixed(2)}</td>
                          <td>${row.purchases}</td>
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
                    : '<div class="no-data">No grocery transactions recorded</div>'
                }
              </div>
            </div>

            <div class="section">
              <div class="section-header">💰 Expense Transactions</div>
              <div class="section-content">
                ${
                  historyItem.expenseRows && historyItem.expenseRows.length > 0
                    ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Expense</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${historyItem.expenseRows
                        .map(
                          (row) => `
                        <tr>
                          <td>${row.expense}</td>
                          <td>₱${row.amount.toFixed(2)}</td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </tbody>
                  </table>
                `
                    : '<div class="no-data">No expense transactions recorded</div>'
                }
              </div>
            </div>
            
            <div class="section">
              <div class="section-header">📋 Summary</div>
              <div class="section-content">
                <table>
                  <tbody>
                    <tr>
                      <td><strong>Total Billiard Transactions:</strong></td>
                      <td>${historyItem.billiardRows ? historyItem.billiardRows.length : 0}</td>
                    </tr>
                    <tr>
                      <td><strong>Total Grocery Transactions:</strong></td>
                      <td>${historyItem.groceryRows ? historyItem.groceryRows.length : 0}</td>
                    </tr>
                    <tr>
                      <td><strong>Total Expense Transactions:</strong></td>
                      <td>${historyItem.expenseRows ? historyItem.expenseRows.length : 0}</td>
                    </tr>
                    <tr>
                      <td><strong>Billiard Revenue:</strong></td>
                      <td>₱${historyItem.billiardPaid.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td><strong>Grocery Revenue:</strong></td>
                      <td>₱${historyItem.groceryTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td><strong>Expense Total:</strong></td>
                      <td>₱${(historyItem.expenseTotal || 0).toFixed(2)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #43cea2; font-weight: bold; font-size: 16px;">
                      <td><strong>Total Revenue:</strong></td>
                      <td><strong>₱${historyItem.combinedTotal.toFixed(2)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </body>
          </html>
        `

        newWindow.document.write(htmlContent)
        newWindow.document.close()
      } catch (error) {
        console.error("Error opening history detail:", error)
      }
    }

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializePage)
    } else {
      initializePage()
    }
  } catch (error) {
    console.error("Critical error in script initialization:", error)
    alert("There was an error loading the application. Please refresh the page and try again.")
  }
})()
