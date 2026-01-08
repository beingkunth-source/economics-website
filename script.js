
document.addEventListener("DOMContentLoaded", function () {
    var header = document.querySelector(".main-header");

    // --- Header shadow on scroll for subtle depth ---
    function updateHeaderShadow() {
        if (!header) return;
        if (window.scrollY > 8) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    }
    updateHeaderShadow();
    window.addEventListener("scroll", updateHeaderShadow, { passive: true });

    // --- Reveal-on-scroll animations using IntersectionObserver ---
    var revealItems = document.querySelectorAll(".reveal-up");
    if ("IntersectionObserver" in window && revealItems.length > 0) {
        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    obs.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1
        });

        revealItems.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        // Fallback: make everything visible
        revealItems.forEach(function (el) {
            el.classList.add("visible");
        });
    }

    // --- Helper function to render news articles ---
    function renderNewsArticles(items, container, statusEl, isIndiaOnly) {
        if (!container || !statusEl) return;

        container.innerHTML = "";

        if (!Array.isArray(items) || items.length === 0) {
            statusEl.textContent = "No recent headlines are available right now. Please try again a bit later.";
            return;
        }

        var finalItems = items.slice(0, 10);

        statusEl.textContent = isIndiaOnly
            ? "These India‑related economics stories are fetched live from Finnhub. Always cross‑check details with the original source."
            : "These are the latest world economics stories from Finnhub. Always cross‑check details with the original source.";

        finalItems.forEach(function (article) {
            var title = article.headline || "Untitled story";
            var source = article.source || "Finnhub";
            var published = article.datetime ? new Date(article.datetime * 1000) : null;
            var description = article.summary || "";
            var url = article.url || "#";

            var item = document.createElement("article");
            item.className = "card news-item reveal-up visible";

            var dateText = published ? published.toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }) : "";

            item.innerHTML =
                '<h3 class="news-title">' + title + '</h3>' +
                '<p class="news-meta small-note">' +
                    (source ? '<span>' + source + '</span>' : "") +
                    (dateText ? ' · <span>' + dateText + '</span>' : "") +
                '</p>' +
                (description ? '<p class="news-desc">' + description + '</p>' : "") +
                (url && url !== "#"
                    ? '<a class="card-link" href="' + url + '" target="_blank" rel="noopener">Read full story →</a>'
                    : "");

            container.appendChild(item);
        });
    }

    // --- World economics news (for world.html) ---
    var worldNewsList = document.getElementById("worldNewsList");
    var worldNewsStatus = document.getElementById("worldNewsStatus");

    if (worldNewsList && worldNewsStatus) {
        var FINNHUB_API_KEY = "d50muc1r01qm94qmvlrgd50muc1r01qm94qmvls0";

        if (!FINNHUB_API_KEY) {
            worldNewsStatus.textContent = "To see live world economics news, please add your Finnhub API key in script.js (FINNHUB_API_KEY).";
            worldNewsList.innerHTML = "";
        } else {
            var endpoint = "https://finnhub.io/api/v1/news"
                + "?category=general"
                + "&token=" + encodeURIComponent(FINNHUB_API_KEY);

            fetch(endpoint)
                .then(function (response) {
                    return response.json().then(function (data) {
                        if (!response.ok) {
                            var msg = (data && (data.message || data.error)) || ("HTTP " + response.status);
                            throw new Error(msg);
                        }
                        return data;
                    });
                })
                .then(function (items) {
                    renderNewsArticles(items, worldNewsList, worldNewsStatus, false);
                })
                .catch(function (error) {
                    console.error("World economics news (Finnhub) error:", error);
                    worldNewsStatus.textContent = "There was a problem loading the world economics news: " + error.message;
                    worldNewsList.innerHTML = "";
                });
        }
    }

    // --- India economics news (for india.html) - India-only ---
    var indiaNewsList = document.getElementById("indiaNewsList");
    var indiaNewsStatus = document.getElementById("indiaNewsStatus");

    if (indiaNewsList && indiaNewsStatus) {
        var FINNHUB_API_KEY = "d50muc1r01qm94qmvlrgd50muc1r01qm94qmvls0";

        if (!FINNHUB_API_KEY) {
            indiaNewsStatus.textContent = "To see live India economics news, please add your Finnhub API key in script.js (FINNHUB_API_KEY).";
            indiaNewsList.innerHTML = "";
        } else {
            var endpoint = "https://finnhub.io/api/v1/news"
                + "?category=general"
                + "&token=" + encodeURIComponent(FINNHUB_API_KEY);

            fetch(endpoint)
                .then(function (response) {
                    return response.json().then(function (data) {
                        if (!response.ok) {
                            var msg = (data && (data.message || data.error)) || ("HTTP " + response.status);
                            throw new Error(msg);
                        }
                        return data;
                    });
                })
                .then(function (items) {
                    // Filter to only India-related stories
                    var indiaItems = items.filter(function (item) {
                        var text = ((item.headline || "") + " " + (item.summary || "")).toLowerCase();
                        return text.includes("india") || text.includes("indian");
                    });

                    if (indiaItems.length === 0) {
                        indiaNewsStatus.textContent = "No India-specific economics news found right now. Please try again later.";
                        indiaNewsList.innerHTML = "";
                    } else {
                        renderNewsArticles(indiaItems, indiaNewsList, indiaNewsStatus, true);
                    }
                })
                .catch(function (error) {
                    console.error("India economics news (Finnhub) error:", error);
                    indiaNewsStatus.textContent = "There was a problem loading the India economics news: " + error.message;
                    indiaNewsList.innerHTML = "";
                });
        }
    }

    // --- Currency Converter (for news.html) ---
    var fromAmount = document.getElementById("fromAmount");
    var fromCurrency = document.getElementById("fromCurrency");
    var toCurrency = document.getElementById("toCurrency");
    var toAmount = document.getElementById("toAmount");
    var convertBtn = document.getElementById("convertBtn");
    var clearBtn = document.getElementById("clearBtn");
    var swapBtn = document.getElementById("swapCurrencies");
    var rateStatus = document.getElementById("rateStatus");

    var exchangeRates = {};
    var lastUpdate = null;

    // Fallback hardcoded rates (base: USD = 1.00)
    var fallbackRates = {
        USD: 1.00,
        INR: 83.00,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 148.00,
        AUD: 1.52,
        CAD: 1.36,
        CHF: 0.88,
        CNY: 7.20,
        SGD: 1.35,
        NZD: 1.63,
        HKD: 7.82,
        KRW: 1320.00,
        ZAR: 18.50,
        RUB: 92.00,
        BRL: 4.90,
        MXN: 17.00,
        AED: 3.67,
        SAR: 3.75,
        IDR: 15500.00,
        THB: 35.50,
        MYR: 4.70,
        PHP: 56.00,
        PKR: 278.00,
        BDT: 110.00,
        LKR: 305.00,
        EGP: 30.90,
        NGN: 1500.00
    };

    function loadExchangeRates() {
        if (rateStatus) {
            rateStatus.textContent = "Loading exchange rates…";
        }

        // Use exchangerate-api.com (free, no key needed, more reliable)
        fetch("https://api.exchangerate-api.com/v4/latest/USD")
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("API response not OK: " + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                console.log("Exchange rate API response:", data);
                if (data && data.rates) {
                    exchangeRates = data.rates;
                    // Ensure USD is in the rates (1.0)
                    exchangeRates.USD = 1.0;
                    // Merge with fallback rates to ensure all currencies are available
                    Object.keys(fallbackRates).forEach(function (code) {
                        if (!exchangeRates[code]) {
                            exchangeRates[code] = fallbackRates[code];
                        }
                    });
                    lastUpdate = new Date();
                    if (rateStatus) {
                        rateStatus.textContent = "Rates updated: " + lastUpdate.toLocaleTimeString();
                    }
                    performConversion();
                } else {
                    throw new Error("Invalid response format from exchange rate API");
                }
            })
            .catch(function (error) {
                console.error("Exchange rate error:", error);
                // Try fallback API
                fetch("https://api.exchangerate.host/latest?base=USD")
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (data) {
                        if (data && data.rates) {
                            exchangeRates = data.rates;
                            exchangeRates.USD = 1.0;
                            // Merge with fallback rates
                            Object.keys(fallbackRates).forEach(function (code) {
                                if (!exchangeRates[code]) {
                                    exchangeRates[code] = fallbackRates[code];
                                }
                            });
                            lastUpdate = new Date();
                            if (rateStatus) {
                                rateStatus.textContent = "Rates updated: " + lastUpdate.toLocaleTimeString();
                            }
                            performConversion();
                        } else {
                            throw new Error("Fallback API also failed");
                        }
                    })
                    .catch(function (fallbackError) {
                        console.error("Fallback API error:", fallbackError);
                        // Use hardcoded fallback rates
                        exchangeRates = fallbackRates;
                        lastUpdate = new Date();
                        if (rateStatus) {
                            rateStatus.textContent = "Using approximate rates (offline mode). Last updated: " + lastUpdate.toLocaleTimeString();
                        }
                        performConversion();
                    });
            });
    }

    function performConversion() {
        if (!fromAmount || !fromCurrency || !toCurrency || !toAmount) return;

        // Check if rates are loaded
        if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
            toAmount.value = "";
            if (rateStatus) {
                rateStatus.textContent = "Loading exchange rates…";
            }
            loadExchangeRates();
            return;
        }

        var amount = parseFloat(fromAmount.value);
        if (isNaN(amount) || amount < 0) {
            toAmount.value = "";
            return;
        }

        var from = fromCurrency.value;
        var to = toCurrency.value;

        if (from === to) {
            toAmount.value = amount.toFixed(2);
            return;
        }

        // Convert to USD first, then to target currency
        var usdAmount;
        if (from === "USD") {
            usdAmount = amount;
        } else if (exchangeRates[from]) {
            usdAmount = amount / exchangeRates[from];
        } else {
            console.error("Rate not found for:", from, "Available rates:", Object.keys(exchangeRates));
            toAmount.value = "Rate unavailable for " + from;
            return;
        }

        var result;
        if (to === "USD") {
            result = usdAmount;
        } else if (exchangeRates[to]) {
            result = usdAmount * exchangeRates[to];
        } else {
            console.error("Rate not found for:", to, "Available rates:", Object.keys(exchangeRates));
            toAmount.value = "Rate unavailable for " + to;
            return;
        }

        toAmount.value = result.toFixed(2);
    }

    if (fromAmount && fromCurrency && toCurrency && toAmount) {
        // Load rates on page load
        loadExchangeRates();

        // Auto-convert on input change
        fromAmount.addEventListener("input", performConversion);
        fromCurrency.addEventListener("change", function () {
            performConversion();
            if (rateStatus && lastUpdate) {
                rateStatus.textContent = "Rates updated: " + lastUpdate.toLocaleTimeString();
            }
        });
        toCurrency.addEventListener("change", function () {
            performConversion();
            if (rateStatus && lastUpdate) {
                rateStatus.textContent = "Rates updated: " + lastUpdate.toLocaleTimeString();
            }
        });

        if (convertBtn) {
            convertBtn.addEventListener("click", function (e) {
                e.preventDefault();
                performConversion();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", function (e) {
                e.preventDefault();
                fromAmount.value = "1";
                toAmount.value = "";
                fromCurrency.value = "INR";
                toCurrency.value = "USD";
                performConversion();
            });
        }

        if (swapBtn) {
            swapBtn.addEventListener("click", function (e) {
                e.preventDefault();
                var temp = fromCurrency.value;
                fromCurrency.value = toCurrency.value;
                toCurrency.value = temp;
                performConversion();
            });
        }
    }

    // --- Simple on-page finance helper chatbot ---
    function createChatbot() {
        if (document.querySelector(".oe-chatbot")) return;

        var wrapper = document.createElement("div");
        wrapper.className = "oe-chatbot";
        wrapper.innerHTML =
            '<button class="oe-chatbot-toggle" aria-label="Open finance helper chat">' +
                '<span class="oe-chatbot-toggle-icon">?</span>' +
            '</button>' +
            '<div class="oe-chatbot-panel" aria-label="Finance helper chat" role="dialog" aria-modal="false">' +
                '<div class="oe-chatbot-header">' +
                    '<div class="oe-chatbot-title">OpenEconomy Helper</div>' +
                    '<button class="oe-chatbot-close" aria-label="Close chat">×</button>' +
                '</div>' +
                '<div class="oe-chatbot-body">' +
                    '<div class="oe-chatbot-messages" aria-live="polite"></div>' +
                '</div>' +
                '<form class="oe-chatbot-input-row">' +
                    '<input type="text" class="oe-chatbot-input" placeholder="Ask a finance or economics question..." aria-label="Type your question" />' +
                    '<button type="submit" class="oe-chatbot-send">Send</button>' +
                '</form>' +
            '</div>';

        document.body.appendChild(wrapper);

        var toggleBtn = wrapper.querySelector(".oe-chatbot-toggle");
        var panel = wrapper.querySelector(".oe-chatbot-panel");
        var closeBtn = wrapper.querySelector(".oe-chatbot-close");
        var form = wrapper.querySelector(".oe-chatbot-input-row");
        var input = wrapper.querySelector(".oe-chatbot-input");
        var messages = wrapper.querySelector(".oe-chatbot-messages");

        function openChat() {
            panel.classList.add("open");
            toggleBtn.classList.add("hidden");
            if (messages.children.length === 0) {
                addBotMessage("Hi! I am your on-page finance helper. Ask me about basics like inflation, GDP, saving, budgeting, or trade, and I will explain in simple language.");
            }
            setTimeout(function () {
                input.focus();
            }, 200);
        }

        function closeChat() {
            panel.classList.remove("open");
            toggleBtn.classList.remove("hidden");
        }

        function addMessage(text, isUser) {
            var bubble = document.createElement("div");
            bubble.className = "oe-chatbot-message " + (isUser ? "user" : "bot");
            bubble.textContent = text;
            messages.appendChild(bubble);
            messages.scrollTop = messages.scrollHeight;
        }

        function addBotMessage(text) {
            addMessage(text, false);
        }

        function generateBotReply(question) {
            var q = question.toLowerCase();

            if (q.includes("inflation")) {
                return "Inflation is a general increase in the prices of goods and services over time. When inflation is moderate and stable, it usually goes together with normal growth. Very high or very low inflation can create uncertainty for households, firms and governments.";
            }
            if (q.includes("gdp") || q.includes("gross domestic product")) {
                return "GDP (Gross Domestic Product) is the total value of all final goods and services produced within a country during a period, usually a year. It is often used as a broad measure of the size of an economy.";
            }
            if (q.includes("unemployment")) {
                return "The unemployment rate measures what share of the labour force is willing and able to work but cannot find a job. High unemployment means an economy is not using its available workers fully.";
            }
            if (q.includes("budget") || q.includes("saving") || q.includes("savings")) {
                return "A simple way to think about personal finance is: 1) track your income and regular expenses, 2) set aside some savings each month before spending on non‑essentials, and 3) avoid high‑cost debt when possible. Even small, regular savings can build up over time.";
            }
            if (q.includes("interest rate") || q.includes("loan")) {
                return "Interest is the cost of borrowing money or the return for saving money. Higher interest rates make borrowing more expensive but can reward savers more. When taking a loan, it is important to understand the interest rate, fees and how long you will need to repay.";
            }
            if (q.includes("trade") || q.includes("export") || q.includes("import")) {
                return "International trade allows countries to specialise in what they can produce relatively efficiently and to import what others produce more efficiently. This specialisation and exchange can raise overall incomes, but it can also create adjustment challenges for some workers or sectors.";
            }

            return "I am a simple on-page helper focused on finance and economics. I can explain core ideas like GDP, inflation, unemployment, saving and budgeting, trade, and basic macro‑ and microeconomics in clear language. Try asking about one specific concept at a time, for example: “What is inflation?” or “How should a beginner think about saving money?”.";
        }

        toggleBtn.addEventListener("click", openChat);
        closeBtn.addEventListener("click", closeChat);

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var text = (input.value || "").trim();
            if (!text) return;
            addMessage(text, true);
            input.value = "";

            setTimeout(function () {
                var reply = generateBotReply(text);
                addBotMessage(reply);
            }, 400);
        });
    }

    createChatbot();
});
