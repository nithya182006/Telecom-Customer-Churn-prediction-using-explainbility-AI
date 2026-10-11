import { useState } from "react";
import "./App.css";

function App() {
  // Sample customer data for presentation
  const sampleCustomers = [
    {
      id: "1001-ABC",
      name: "Raj Kumar",
      gender: "Male",
      age: 32,
      state: "Delhi",
      tenure: 2,
      monthlyCharges: 89.5,
      totalCharges: 179,
      contract: "Month-to-month",
      internetService: "Fiber optic",
      onlineSecurity: "No",
      paymentMethod: "Credit Card"
    },
    {
      id: "1002-DEF",
      name: "Priya Singh",
      gender: "Female",
      age: 28,
      state: "Mumbai",
      tenure: 6,
      monthlyCharges: 65.2,
      totalCharges: 391.2,
      contract: "Month-to-month",
      internetService: "DSL",
      onlineSecurity: "Yes",
      paymentMethod: "Bank Transfer"
    },
    {
      id: "1003-GHI",
      name: "Amit Patel",
      gender: "Male",
      age: 45,
      state: "Bangalore",
      tenure: 48,
      monthlyCharges: 55.0,
      totalCharges: 2640,
      contract: "Two Year",
      internetService: "DSL",
      onlineSecurity: "Yes",
      paymentMethod: "Credit Card"
    },
    {
      id: "1004-JKL",
      name: "Neha Sharma",
      gender: "Female",
      age: 35,
      state: "Hyderabad",
      tenure: 14,
      monthlyCharges: 72.8,
      totalCharges: 1019.2,
      contract: "One Year",
      internetService: "Fiber optic",
      onlineSecurity: "No",
      paymentMethod: "Credit Card"
    },
    {
      id: "1005-MNO",
      name: "Vikram Rao",
      gender: "Male",
      age: 26,
      state: "Pune",
      tenure: 1,
      monthlyCharges: 95.5,
      totalCharges: 95.5,
      contract: "Month-to-month",
      internetService: "Fiber optic",
      onlineSecurity: "No",
      paymentMethod: "Credit Card"
    },
    {
      id: "1006-PQR",
      name: "Kavya Nair",
      gender: "Female",
      age: 52,
      state: "Chennai",
      tenure: 72,
      monthlyCharges: 49.9,
      totalCharges: 3592.8,
      contract: "Two Year",
      internetService: "DSL",
      onlineSecurity: "Yes",
      paymentMethod: "Auto Pay"
    }
  ];

  const [view, setView] = useState("list"); // "list" or "detail"
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [gender, setGender] = useState("Male");
  const [age, setAge] = useState("");
  const [state, setState] = useState("");
  const [tenure, setTenure] = useState("");
  const [monthlyCharges, setMonthlyCharges] = useState("");
  const [totalCharges, setTotalCharges] = useState("");
  const [contract, setContract] = useState("Month-to-month");
  const [internetService, setInternetService] = useState("Yes");
4  const [onlineSecurity, setOnlineSecurity] = useState("No");
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  
  const [prediction, setPrediction] = useState(null);
  const [churnProbability, setChurnProbability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineError, setPipelineError] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [retentionAdvice, setRetentionAdvice] = useState(null);

  const predictChurn = async (formData) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setChurnProbability(result.churnProbability);
      setPrediction(result.prediction);
      setExplanation(result.explanation);

      // Retention advice should not block showing churn prediction.
      try {
        const retentionResponse = await fetch('http://localhost:5000/api/retention-advice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            churnProbability: result.churnProbability
          }),
        });

        if (!retentionResponse.ok) {
          throw new Error(`Retention API error! status: ${retentionResponse.status}`);
        }

        const retentionResult = await retentionResponse.json();
        setRetentionAdvice(retentionResult);
      } catch (retentionError) {
        console.error('Error fetching retention advice:', retentionError);
        setRetentionAdvice(null);
      }

    } catch (error) {
      console.error('Error predicting churn:', error);
      setPrediction('Error');
      setChurnProbability(null);
      setExplanation(null);
      setRetentionAdvice(null);
      alert(`Error: ${error.message}. Please check if the backend server is running.`);
    } finally {
      setLoading(false);
    }
  };

  const getPipelineStatus = async () => {
    try {
      setPipelineError(null);
      const response = await fetch('http://localhost:5000/api/pipeline-status');
      if (!response.ok) {
        throw new Error(`Pipeline status failed: ${response.status}`);
      }
      const result = await response.json();
      setPipelineStatus({
        ...result,
        accuracy: result.accuracy ?? result.metrics?.accuracy ?? null,
        f1_score: result.f1_score ?? result.metrics?.f1 ?? null,
        training_time: result.training_time ?? null
      });
    } catch (error) {
      console.error('Error getting pipeline status:', error);
      setPipelineError(error.message);
    }
  };

  const runPipeline = async () => {
    try {
      setPipelineRunning(true);
      setPipelineError(null);
      const response = await fetch('http://localhost:5000/api/run-pipeline', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`Run pipeline failed: ${response.status}`);
      }
      const result = await response.json();
      setPipelineStatus(result);
      await getPipelineStatus();
    } catch (error) {
      console.error('Error running pipeline:', error);
      setPipelineError(error.message);
    } finally {
      setPipelineRunning(false);
    }
  };

  const calculateChurnProbability = (formData) => {
    // Fallback to local calculation if API fails
    let probability = 0.2; // Base probability

    // Tenure factor (strongest predictor)
    if (formData.tenure < 6) probability += 0.35;
    else if (formData.tenure < 12) probability += 0.25;
    else if (formData.tenure < 24) probability += 0.10;

    // Monthly charges factor
    if (formData.monthlyCharges > 80) probability += 0.15;
    else if (formData.monthlyCharges > 60) probability += 0.08;

    // Total charges factor
    if (formData.totalCharges < 500) probability += 0.10;

    // Contract type factor
    if (formData.contract === "Month-to-month") probability += 0.20;
    else if (formData.contract === "One Year") probability += 0.05;

    // Internet service factor
    if (formData.internetService === "Fiber optic") probability += 0.10;

    // Online security factor
    if (formData.onlineSecurity === "No") probability += 0.08;

    // Age factor
    if (formData.age < 30) probability += 0.10;

    return Math.min(probability, 0.95);
  };

  const handleSelectCustomer = (customer) => {
    setCustomerId(customer.id);
    setGender(customer.gender);
    setAge(customer.age);
    setState(customer.state);
    setTenure(customer.tenure);
    setMonthlyCharges(customer.monthlyCharges);
    setTotalCharges(customer.totalCharges);
    setContract(customer.contract);
    setInternetService(customer.internetService);
    setOnlineSecurity(customer.onlineSecurity);
    setPaymentMethod(customer.paymentMethod);
    setSelectedCustomer(customer);
    
    // Auto-predict using API
    const formData = {
      customerId: customer.id,
      age: customer.age,
      tenure: customer.tenure,
      monthlyCharges: customer.monthlyCharges,
      totalCharges: customer.totalCharges,
      contract: customer.contract,
      internetService: customer.internetService,
      onlineSecurity: customer.onlineSecurity,
      paymentMethod: customer.paymentMethod
    };
    predictChurn(formData);
    
    setView("detail");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = {
      customerId: customerId,
      age: parseFloat(age),
      tenure: parseFloat(tenure),
      monthlyCharges: parseFloat(monthlyCharges),
      totalCharges: parseFloat(totalCharges),
      contract,
      internetService,
      onlineSecurity,
      paymentMethod
    };

    predictChurn(formData);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        marginBottom: "30px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: "20px",
        padding: "20px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
        backdropFilter: "blur(10px)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <div>
            <h1 style={{
              color: "#2C3E50",
              margin: "0 0 5px 0",
              fontSize: "36px",
              fontWeight: "bold",
              background: "linear-gradient(45deg, #6B2D9F, #3498DB)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              📊 Telecom Churn Prediction System
            </h1>
            <p style={{ color: "#666", margin: 0, fontSize: "16px" }}>
              AI-Powered Customer Retention & Explainable Analytics
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => setView("list")}
              style={{
                backgroundColor: view === "list" ? "linear-gradient(45deg, #3498DB, #2980B9)" : "rgba(255, 255, 255, 0.8)",
                color: view === "list" ? "white" : "#2C3E50",
                padding: "12px 25px",
                border: "none",
                borderRadius: "25px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                transition: "all 0.3s ease",
                boxShadow: view === "list" ? "0 4px 15px rgba(52, 152, 219, 0.3)" : "0 2px 10px rgba(0,0,0,0.1)",
                backdropFilter: "blur(10px)"
              }}
            >
              📊 Customer List
            </button>
            <button
              onClick={() => {
                setView("detail");
                setSelectedCustomer(null);
                setPrediction(null);
                setExplanation(null);
                setRetentionAdvice(null);
              }}
              style={{
                backgroundColor: view === "detail" ? "linear-gradient(45deg, #3498DB, #2980B9)" : "rgba(255, 255, 255, 0.8)",
                color: view === "detail" ? "white" : "#2C3E50",
                padding: "12px 25px",
                border: "none",
                borderRadius: "25px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                transition: "all 0.3s ease",
                boxShadow: view === "detail" ? "0 4px 15px rgba(52, 152, 219, 0.3)" : "0 2px 10px rgba(0,0,0,0.1)",
                backdropFilter: "blur(10px)"
              }}
            >
              ➕ New Prediction
            </button>
            <button
              onClick={() => {
                getPipelineStatus();
                setView("pipeline");
              }}
              style={{
                backgroundColor: view === "pipeline" ? "linear-gradient(45deg, #3498DB, #2980B9)" : "rgba(255, 255, 255, 0.8)",
                color: view === "pipeline" ? "white" : "#2C3E50",
                padding: "12px 25px",
                border: "none",
                borderRadius: "25px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                transition: "all 0.3s ease",
                boxShadow: view === "pipeline" ? "0 4px 15px rgba(52, 152, 219, 0.3)" : "0 2px 10px rgba(0,0,0,0.1)",
                backdropFilter: "blur(10px)"
              }}
            >
              🚀 Pipeline Status
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Views */}
      {(() => {
        switch (view) {
          case "list":
            return (
              <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "20px",
                  padding: "30px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                  backdropFilter: "blur(10px)",
                  marginBottom: "20px"
                }}>
                  <h1 style={{
                    color: "#2C3E50",
                    marginBottom: "10px",
                    fontSize: "32px",
                    fontWeight: "bold",
                    textAlign: "center"
                  }}>
                    👥 Customer Overview Dashboard
                  </h1>
                  <p style={{ color: "#666", textAlign: "center", marginBottom: "30px", fontSize: "16px" }}>
                    Click on any customer card to view detailed analysis and retention strategies
                  </p>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "25px"
                }}>
                  {sampleCustomers.map((customer) => {
                    const prob = calculateChurnProbability(customer);
                    const pred = prob > 0.5 ? "Will Churn" : "Will Stay";
                    const riskColor = prob > 0.7 ? "#DC143C" : prob > 0.5 ? "#FF9800" : "#228B22";
                    const riskEmoji = prob > 0.7 ? "🔴" : prob > 0.5 ? "🟡" : "🟢";
                    return (
                      <div
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "20px",
                          padding: "25px",
                          cursor: "pointer",
                          boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                          transition: "all 0.3s ease",
                          border: `2px solid ${riskColor}20`,
                          backdropFilter: "blur(10px)",
                          position: "relative",
                          overflow: "hidden"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                          e.currentTarget.style.boxShadow = "0 15px 40px rgba(0,0,0,0.2)";
                          e.currentTarget.style.borderColor = riskColor;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = "translateY(0) scale(1)";
                          e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.1)";
                          e.currentTarget.style.borderColor = `${riskColor}20`;
                        }}
                      >
                        {/* Risk indicator badge */}
                        <div style={{
                          position: "absolute",
                          top: "15px",
                          right: "15px",
                          backgroundColor: riskColor,
                          color: "white",
                          borderRadius: "20px",
                          padding: "5px 12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                        }}>
                          {riskEmoji} {(prob * 100).toFixed(0)}%
                        </div>

                        <div style={{ marginBottom: "20px" }}>
                          <h3 style={{
                            color: "#6B2D9F",
                            marginTop: 0,
                            marginBottom: "5px",
                            fontSize: "20px",
                            fontWeight: "bold"
                          }}>
                            {customer.name}
                          </h3>
                          <p style={{
                            color: "#666",
                            fontSize: "14px",
                            margin: "0 0 15px 0"
                          }}>
                            ID: {customer.id}
                          </p>
                        </div>

                        <div style={{
                          backgroundColor: "#F8F9FA",
                          padding: "15px",
                          borderRadius: "12px",
                          marginBottom: "15px"
                        }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                            <div>
                              <span style={{ color: "#666", fontWeight: "bold" }}>Age:</span>
                              <span style={{ color: "#2C3E50", marginLeft: "5px" }}>{customer.age}</span>
                            </div>
                            <div>
                              <span style={{ color: "#666", fontWeight: "bold" }}>Tenure:</span>
                              <span style={{ color: "#2C3E50", marginLeft: "5px" }}>{customer.tenure} months</span>
                            </div>
                            <div>
                              <span style={{ color: "#666", fontWeight: "bold" }}>Monthly:</span>
                              <span style={{ color: "#2C3E50", marginLeft: "5px" }}>₹{customer.monthlyCharges}</span>
                            </div>
                            <div>
                              <span style={{ color: "#666", fontWeight: "bold" }}>Contract:</span>
                              <span style={{ color: "#2C3E50", marginLeft: "5px" }}>{customer.contract}</span>
                            </div>
                          </div>

                          {/* Quick Churn Indicators */}
                          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #DEE2E6" }}>
                            {customer.tenure < 6 && (
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                                <span style={{ color: "#FF9800", fontSize: "12px" }}>⚠️</span>
                                <span style={{ color: "#FF9800", fontSize: "11px", fontWeight: "bold" }}>New customer</span>
                              </div>
                            )}
                            {customer.monthlyCharges > 80 && (
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                                <span style={{ color: "#DC143C", fontSize: "12px" }}>💰</span>
                                <span style={{ color: "#DC143C", fontSize: "11px", fontWeight: "bold" }}>High charges</span>
                              </div>
                            )}
                            {customer.contract === 'Month-to-month' && (
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                                <span style={{ color: "#FF9800", fontSize: "12px" }}>📅</span>
                                <span style={{ color: "#FF9800", fontSize: "11px", fontWeight: "bold" }}>Flexible contract</span>
                              </div>
                            )}
                            {customer.onlineSecurity === 'No' && (
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                                <span style={{ color: "#DC143C", fontSize: "12px" }}>🔒</span>
                                <span style={{ color: "#DC143C", fontSize: "11px", fontWeight: "bold" }}>No security</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{
                          backgroundColor: `${riskColor}15`,
                          padding: "15px",
                          borderRadius: "12px",
                          textAlign: "center",
                          border: `2px solid ${riskColor}30`
                        }}>
                          <p style={{
                            margin: "0 0 8px 0",
                            fontWeight: "bold",
                            fontSize: "16px",
                            color: riskColor
                          }}>
                            {pred}
                          </p>
                          <div style={{
                            backgroundColor: riskColor,
                            height: "6px",
                            borderRadius: "3px",
                            margin: "0 auto",
                            width: `${prob * 100}%`,
                            maxWidth: "100%",
                            transition: "width 0.3s ease"
                          }}></div>
                        </div>

                        {/* Hover hint */}
                        <div style={{
                          position: "absolute",
                          bottom: "10px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          opacity: 0,
                          transition: "opacity 0.3s ease",
                          color: "#666",
                          fontSize: "12px",
                          fontStyle: "italic"
                        }}>
                          Click for detailed analysis →
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          case "detail":
            return (
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 15px 50px rgba(0,0,0,0.1)",
          backdropFilter: "blur(10px)"
        }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h1 style={{
              color: "#6B2D9F",
              marginBottom: "10px",
              fontSize: "32px",
              fontWeight: "bold"
            }}>
              Customer Analysis Portal
            </h1>
            <p style={{
              color: "#666",
              marginBottom: "0",
              fontSize: "16px"
            }}>
              {selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.id}` : "Enter customer details for AI-powered churn analysis"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ marginBottom: "40px" }}>
            {/* Personal Information */}
            <div style={{
              backgroundColor: "#F8F9FA",
              padding: "30px",
              borderRadius: "15px",
              marginBottom: "25px",
              border: "1px solid #E9ECEF"
            }}>
              <h3 style={{
                color: "#6B2D9F",
                borderBottom: "3px solid #6B2D9F",
                paddingBottom: "15px",
                marginBottom: "25px",
                fontSize: "20px",
                fontWeight: "bold"
              }}>
                👤 Personal Information
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "25px"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Customer ID:
                  </label>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      transition: "border-color 0.3s ease",
                      backgroundColor: "white"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3498DB"}
                    onBlur={(e) => e.target.style.borderColor = "#E9ECEF"}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Gender:
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      backgroundColor: "white",
                      cursor: "pointer"
                    }}
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Age:
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      transition: "border-color 0.3s ease",
                      backgroundColor: "white"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3498DB"}
                    onBlur={(e) => e.target.style.borderColor = "#E9ECEF"}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    State:
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      transition: "border-color 0.3s ease",
                      backgroundColor: "white"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3498DB"}
                    onBlur={(e) => e.target.style.borderColor = "#E9ECEF"}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div style={{
              backgroundColor: "#F8F9FA",
              padding: "30px",
              borderRadius: "15px",
              marginBottom: "25px",
              border: "1px solid #E9ECEF"
            }}>
              <h3 style={{
                color: "#6B2D9F",
                borderBottom: "3px solid #6B2D9F",
                paddingBottom: "15px",
                marginBottom: "25px",
                fontSize: "20px",
                fontWeight: "bold"
              }}>
                📡 Service Details
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "25px"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Tenure (Months):
                  </label>
                  <input
                    type="number"
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      transition: "border-color 0.3s ease",
                      backgroundColor: "white"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3498DB"}
                    onBlur={(e) => e.target.style.borderColor = "#E9ECEF"}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Monthly Charge:
                  </label>
                  <input
                    type="number"
                    value={monthlyCharges}
                    onChange={(e) => setMonthlyCharges(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      transition: "border-color 0.3s ease",
                      backgroundColor: "white"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3498DB"}
                    onBlur={(e) => e.target.style.borderColor = "#E9ECEF"}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Total Charges:
                  </label>
                  <input
                    type="number"
                    value={totalCharges}
                    onChange={(e) => setTotalCharges(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      transition: "border-color 0.3s ease",
                      backgroundColor: "white"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3498DB"}
                    onBlur={(e) => e.target.style.borderColor = "#E9ECEF"}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Contract:
                  </label>
                  <select
                    value={contract}
                    onChange={(e) => setContract(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      backgroundColor: "white",
                      cursor: "pointer"
                    }}
                  >
                    <option>Month-to-month</option>
                    <option>One Year</option>
                    <option>Two Year</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Internet Service:
                  </label>
                  <select
                    value={internetService}
                    onChange={(e) => setInternetService(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      backgroundColor: "white",
                      cursor: "pointer"
                    }}
                  >
                    <option>DSL</option>
                    <option>Fiber optic</option>
                    <option>No</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#2C3E50",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Online Security:
                  </label>
                  <select
                    value={onlineSecurity}
                    onChange={(e) => setOnlineSecurity(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "2px solid #E9ECEF",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      backgroundColor: "white",
                      cursor: "pointer"
                    }}
                  >
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <button
                type="submit"
                style={{
                  background: "linear-gradient(45deg, #3498DB, #2980B9)",
                  color: "white",
                  padding: "15px 40px",
                  border: "none",
                  borderRadius: "25px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(52, 152, 219, 0.3)",
                  width: "100%",
                  maxWidth: "300px"
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(52, 152, 219, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(52, 152, 219, 0.3)";
                }}
              >
                🔮 Analyze Customer
              </button>
            </div>
          </form>

          {/* Prediction Results */}
          {loading ? (
            <div style={{ marginTop: "30px", backgroundColor: "#FFF", padding: "20px", borderRadius: "10px", textAlign: "center" }}>
              <p style={{ color: "#2C3E50", fontSize: "18px", fontWeight: "bold" }}>🔄 Analyzing customer data...</p>
            </div>
          ) : prediction && (
            <div style={{ marginTop: "30px" }}>
              {/* Main Prediction Card */}
              <div style={{ backgroundColor: "#FFF", padding: "30px", borderRadius: "15px", boxShadow: "0 8px 25px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <h3 style={{ color: "#6B2D9F", borderBottom: "3px solid #6B2D9F", paddingBottom: "15px", marginBottom: "20px", fontSize: "24px" }}>🎯 Prediction Result</h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <p style={{ fontSize: "18px", color: "#333", marginBottom: "10px" }}>
                      <strong>Predicted Outcome:</strong>
                    </p>
                    <span style={{
                      color: prediction === "High Risk" ? "#DC143C" : "#228B22",
                      fontSize: "28px",
                      fontWeight: "bold",
                      backgroundColor: prediction === "High Risk" ? "#FFE6E6" : "#E6FFE6",
                      padding: "10px 20px",
                      borderRadius: "25px",
                      display: "inline-block"
                    }}>
                      {prediction === "High Risk" ? "⚠️ " : "✅ "}{prediction}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "18px", color: "#333", marginBottom: "10px" }}>
                      <strong>Churn Probability:</strong>
                    </p>
                    <div style={{
                      fontSize: "36px",
                      fontWeight: "bold",
                      color: "#6B2D9F",
                      backgroundColor: "#F0E6FF",
                      padding: "15px 25px",
                      borderRadius: "15px",
                      display: "inline-block"
                    }}>
                      {(churnProbability * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                  marginTop: "20px",
                  backgroundColor: "#E8E8E8",
                  borderRadius: "10px",
                  height: "25px",
                  overflow: "hidden",
                  position: "relative"
                }}>
                  <div style={{
                    background: `linear-gradient(90deg, ${churnProbability > 0.7 ? "#DC143C" : churnProbability > 0.5 ? "#FF9800" : "#228B22"} 0%, ${churnProbability > 0.7 ? "#FF6B6B" : churnProbability > 0.5 ? "#FFB74D" : "#66BB6A"} 100%)`,
                    height: "100%",
                    width: `${churnProbability * 100}%`,
                    transition: "width 1s ease-in-out",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "14px"
                  }}>
                    {(churnProbability * 100).toFixed(1)}%
                  </div>
                </div>

                <p style={{
                  marginTop: "15px",
                  color: "#666",
                  fontSize: "16px",
                  textAlign: "center",
                  fontStyle: "italic"
                }}>
                  {churnProbability > 0.7 ? "🚨 Critical: Immediate intervention required!" :
                   churnProbability > 0.5 ? "⚠️ High Priority: Action needed soon" :
                   "✅ Low Risk: Monitor periodically"}
                </p>
              </div>

              {/* Quick Summary Card */}
              {explanation && explanation.churn_reasons && explanation.churn_reasons.length > 0 && (
                <div style={{
                  backgroundColor: "#FFF",
                  padding: "25px",
                  borderRadius: "15px",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  marginBottom: "20px",
                  border: "2px solid #6B2D9F"
                }}>
                  <h3 style={{
                    color: "#6B2D9F",
                    marginBottom: "15px",
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    📋 Quick Summary
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div style={{
                      backgroundColor: "#FFF5F5",
                      padding: "15px",
                      borderRadius: "10px",
                      borderLeft: "4px solid #DC143C"
                    }}>
                      <h4 style={{ color: "#DC143C", margin: "0 0 8px 0", fontSize: "16px" }}>🚨 Main Reason for Leaving:</h4>
                      <p style={{ margin: 0, color: "#2C3E50", fontSize: "14px", lineHeight: "1.4" }}>
                        {explanation.churn_reasons[0]?.reason || "Analysis in progress..."}
                      </p>
                    </div>
                    <div style={{
                      backgroundColor: "#F0FFF0",
                      padding: "15px",
                      borderRadius: "10px",
                      borderLeft: "4px solid #28A745"
                    }}>
                      <h4 style={{ color: "#28A745", margin: "0 0 8px 0", fontSize: "16px" }}>💡 Top Advice for Staying:</h4>
                      <p style={{ margin: 0, color: "#2C3E50", fontSize: "14px", lineHeight: "1.4" }}>
                        {explanation.retention_advice && explanation.retention_advice[0]?.advice || "Analysis in progress..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Explainable AI Section */}
              {explanation && (
                <div style={{ backgroundColor: "#FFF", padding: "30px", borderRadius: "15px", boxShadow: "0 8px 25px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                  <h3 style={{ color: "#6B2D9F", borderBottom: "3px solid #3498DB", paddingBottom: "15px", marginBottom: "20px", fontSize: "24px" }}>🧠 Why This Customer Might Leave</h3>

                  {/* Churn Reasons */}
                  {explanation && explanation.churn_reasons && explanation.churn_reasons.length > 0 && (
                    <div style={{ marginBottom: "30px" }}>
                      <h4 style={{ color: "#2C3E50", marginBottom: "20px", fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        🚨 Key Reasons for Leaving
                      </h4>
                      <div style={{ display: "grid", gap: "15px" }}>
                        {explanation.churn_reasons.map((reason, index) => (
                          <div key={index} style={{
                            backgroundColor: reason.impact === 'high' ? "#FFF5F5" : "#FFF8E1",
                            padding: "20px",
                            borderRadius: "12px",
                            borderLeft: `5px solid ${reason.impact === 'high' ? "#DC143C" : "#FF9800"}`,
                            boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                            position: "relative"
                          }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "15px" }}>
                              <div style={{
                                fontSize: "24px",
                                color: reason.impact === 'high' ? "#DC143C" : "#FF9800",
                                fontWeight: "bold",
                                minWidth: "30px"
                              }}>
                                {index + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  margin: "0 0 10px 0",
                                  color: "#2C3E50",
                                  fontSize: "16px",
                                  fontWeight: "500",
                                  lineHeight: "1.4"
                                }}>
                                  {reason.reason}
                                </p>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{
                                    backgroundColor: reason.impact === 'high' ? "#DC143C" : "#FF9800",
                                    color: "white",
                                    padding: "4px 12px",
                                    borderRadius: "15px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    textTransform: "uppercase"
                                  }}>
                                    {reason.impact} Impact
                                  </span>
                                  <div style={{
                                    flex: 1,
                                    backgroundColor: "#E9ECEF",
                                    height: "6px",
                                    borderRadius: "3px",
                                    overflow: "hidden",
                                    maxWidth: "100px"
                                  }}>
                                    <div style={{
                                      backgroundColor: reason.impact === 'high' ? "#DC143C" : "#FF9800",
                                      height: "100%",
                                      width: `${Math.min(reason.severity * 200, 100)}%`,
                                      borderRadius: "3px"
                                    }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Retention Advice */}
                  {explanation && explanation.retention_advice && explanation.retention_advice.length > 0 && (
                    <div>
                      <h4 style={{ color: "#2C3E50", marginBottom: "20px", fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        💡 How to Keep This Customer
                      </h4>
                      <div style={{ display: "grid", gap: "15px" }}>
                        {explanation.retention_advice.map((advice, index) => (
                          <div key={index} style={{
                            backgroundColor: advice.priority === 'high' ? "#F0FFF0" : "#F8F9FA",
                            padding: "20px",
                            borderRadius: "12px",
                            borderLeft: `5px solid ${advice.priority === 'high' ? "#28A745" : "#17A2B8"}`,
                            boxShadow: "0 3px 10px rgba(0,0,0,0.08)"
                          }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "15px" }}>
                              <div style={{
                                fontSize: "20px",
                                color: advice.priority === 'high' ? "#28A745" : "#17A2B8",
                                fontWeight: "bold",
                                minWidth: "25px"
                              }}>
                                ✓
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  margin: "0 0 10px 0",
                                  color: "#2C3E50",
                                  fontSize: "16px",
                                  fontWeight: "500",
                                  lineHeight: "1.4"
                                }}>
                                  {advice.advice}
                                </p>
                                <span style={{
                                  backgroundColor: advice.priority === 'high' ? "#28A745" : "#17A2B8",
                                  color: "white",
                                  padding: "3px 10px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  textTransform: "uppercase"
                                }}>
                                  {advice.priority} Priority
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Level Summary */}
                  {explanation && explanation.risk_level && (
                    <div style={{
                      marginTop: "25px",
                      padding: "20px",
                      backgroundColor: explanation.risk_level === 'High' ? "#FFF5F5" : explanation.risk_level === 'Medium' ? "#FFF8E1" : "#F0FFF0",
                      borderRadius: "10px",
                      border: `2px solid ${explanation.risk_level === 'High' ? "#DC143C" : explanation.risk_level === 'Medium' ? "#FF9800" : "#28A745"}`,
                      textAlign: "center"
                    }}>
                      <h4 style={{
                        margin: "0 0 10px 0",
                        color: explanation.risk_level === 'High' ? "#DC143C" : explanation.risk_level === 'Medium' ? "#FF9800" : "#28A745",
                        fontSize: "18px",
                        fontWeight: "bold"
                      }}>
                        {explanation.risk_level === 'High' ? "🚨" : explanation.risk_level === 'Medium' ? "⚠️" : "✅"} {explanation.risk_level} Risk Assessment
                      </h4>
                      <p style={{
                        margin: 0,
                        color: "#2C3E50",
                        fontSize: "14px"
                      }}>
                        {explanation.risk_level === 'High'
                          ? "Immediate action required - customer shows strong indicators of leaving"
                          : explanation.risk_level === 'Medium'
                          ? "Monitor closely and implement retention strategies"
                          : "Customer appears stable with low churn indicators"
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Retention Strategies Section */}
              {retentionAdvice && (
                <div style={{ backgroundColor: "#FFF", padding: "30px", borderRadius: "15px", boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ color: "#6B2D9F", borderBottom: "3px solid #28A745", paddingBottom: "15px", marginBottom: "20px", fontSize: "24px" }}>🎯 Retention Strategies & Advice</h3>

                  {/* Risk and Value Assessment */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "25px" }}>
                    <div style={{
                      backgroundColor: retentionAdvice.churnRisk === 'High' ? "#FFF5F5" : retentionAdvice.churnRisk === 'Medium' ? "#FFF8E1" : "#F0FFF0",
                      padding: "20px",
                      borderRadius: "10px",
                      textAlign: "center",
                      border: `2px solid ${retentionAdvice.churnRisk === 'High' ? "#DC143C" : retentionAdvice.churnRisk === 'Medium' ? "#FF9800" : "#228B22"}`
                    }}>
                      <h4 style={{ color: "#2C3E50", marginBottom: "10px" }}>Risk Level</h4>
                      <span style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: retentionAdvice.churnRisk === 'High' ? "#DC143C" : retentionAdvice.churnRisk === 'Medium' ? "#FF9800" : "#228B22"
                      }}>
                        {retentionAdvice.churnRisk === 'High' ? "🔴" : retentionAdvice.churnRisk === 'Medium' ? "🟡" : "🟢"} {retentionAdvice.churnRisk}
                      </span>
                    </div>

                    <div style={{
                      backgroundColor: retentionAdvice.clvCategory === 'High' ? "#F0F8FF" : "#F5F5F5",
                      padding: "20px",
                      borderRadius: "10px",
                      textAlign: "center",
                      border: `2px solid ${retentionAdvice.clvCategory === 'High' ? "#4169E1" : "#6C757D"}`
                    }}>
                      <h4 style={{ color: "#2C3E50", marginBottom: "10px" }}>Customer Value</h4>
                      <span style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: retentionAdvice.clvCategory === 'High' ? "#4169E1" : "#6C757D"
                      }}>
                        {retentionAdvice.clvCategory === 'High' ? "💎" : "📊"} {retentionAdvice.clvCategory} Value
                      </span>
                    </div>

                    <div style={{
                      backgroundColor: "#F8F9FA",
                      padding: "20px",
                      borderRadius: "10px",
                      textAlign: "center",
                      border: "2px solid #6B2D9F"
                    }}>
                      <h4 style={{ color: "#2C3E50", marginBottom: "10px" }}>Priority Score</h4>
                      <span style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#6B2D9F"
                      }}>
                        🎯 {retentionAdvice.priorityScore.toFixed(1)}/100
                      </span>
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div style={{ marginBottom: "25px" }}>
                    <h4 style={{ color: "#2C3E50", marginBottom: "15px", fontSize: "18px" }}>📋 Recommended Action:</h4>
                    <div style={{
                      backgroundColor: "#E8F5E8",
                      padding: "20px",
                      borderRadius: "10px",
                      borderLeft: "5px solid #28A745"
                    }}>
                      <p style={{ margin: 0, color: "#2C3E50", fontSize: "16px", fontWeight: "bold" }}>
                        {retentionAdvice.recommendedAction}
                      </p>
                    </div>
                  </div>

                  {/* Specific Advice */}
                  {retentionAdvice.specificAdvice && retentionAdvice.specificAdvice.length > 0 && (
                    <div style={{ marginBottom: "25px" }}>
                      <h4 style={{ color: "#2C3E50", marginBottom: "15px", fontSize: "18px" }}>💡 Specific Retention Advice:</h4>
                      <div style={{ display: "grid", gap: "10px" }}>
                        {retentionAdvice.specificAdvice.map((advice, index) => (
                          <div key={index} style={{
                            backgroundColor: "#FFF8E1",
                            padding: "15px",
                            borderRadius: "8px",
                            borderLeft: "4px solid #FF9800",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                          }}>
                            <p style={{ margin: 0, color: "#2C3E50", fontSize: "14px", lineHeight: "1.4" }}>
                              • {advice}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Potential Savings */}
                  {retentionAdvice.estimatedSavings && (
                    <div>
                      <h4 style={{ color: "#2C3E50", marginBottom: "15px", fontSize: "18px" }}>💰 Business Impact:</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
                        <div style={{
                          backgroundColor: "#F0F8FF",
                          padding: "15px",
                          borderRadius: "8px",
                          textAlign: "center",
                          border: "2px solid #4169E1"
                        }}>
                          <p style={{ margin: "5px 0", color: "#2C3E50", fontSize: "14px" }}>Potential Revenue</p>
                          <p style={{ margin: "5px 0", color: "#4169E1", fontSize: "18px", fontWeight: "bold" }}>
                            ₹{retentionAdvice.estimatedSavings.potentialRevenue.toLocaleString()}
                          </p>
                        </div>
                        <div style={{
                          backgroundColor: "#FFF5F5",
                          padding: "15px",
                          borderRadius: "8px",
                          textAlign: "center",
                          border: "2px solid #DC143C"
                        }}>
                          <p style={{ margin: "5px 0", color: "#2C3E50", fontSize: "14px" }}>Expected Savings</p>
                          <p style={{ margin: "5px 0", color: "#DC143C", fontSize: "18px", fontWeight: "bold" }}>
                            ₹{retentionAdvice.estimatedSavings.expectedSavings.toLocaleString()}
                          </p>
                        </div>
                        <div style={{
                          backgroundColor: "#F0FFF0",
                          padding: "15px",
                          borderRadius: "8px",
                          textAlign: "center",
                          border: "2px solid #228B22"
                        }}>
                          <p style={{ margin: "5px 0", color: "#2C3E50", fontSize: "14px" }}>Success Rate</p>
                          <p style={{ margin: "5px 0", color: "#228B22", fontSize: "18px", fontWeight: "bold" }}>
                            {(retentionAdvice.estimatedSavings.retentionSuccessRate * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
          case "pipeline":
            return (
        <>
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          backdropFilter: "blur(10px)",
          marginBottom: "30px"
        }}>
          <h1 style={{
            color: "#2C3E50",
            marginBottom: "10px",
            fontSize: "32px",
              fontWeight: "bold",
              textAlign: "center"
            }}>
              🚀 ML Pipeline Analytics
            </h1>
            <p style={{
              color: "#666",
              textAlign: "center",
              marginBottom: "0",
              fontSize: "16px"
            }}>
              Monitor your machine learning pipeline performance and metrics
            </p>
          </div>

          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "20px",
            padding: "40px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            backdropFilter: "blur(10px)"
          }}>
            {pipelineStatus ? (
              <div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "30px",
                  flexWrap: "wrap",
                  gap: "20px"
                }}>
                  <h2 style={{
                    color: "#6B2D9F",
                    marginBottom: "0",
                    fontSize: "24px",
                    fontWeight: "bold"
                  }}>
                    📊 Pipeline Execution Results
                  </h2>
                  <div style={{
                    padding: "10px 20px",
                    borderRadius: "25px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "white",
                    backgroundColor: pipelineStatus.status === 'completed' ? "#27AE60" : "#F39C12"
                  }}>
                    Status: {pipelineStatus.status}
                  </div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "20px",
                  marginBottom: "30px"
                }}>
                  <div style={{
                    backgroundColor: "#F8F9FA",
                    padding: "20px",
                    borderRadius: "15px",
                    border: "1px solid #E9ECEF"
                  }}>
                    <h3 style={{ color: "#2C3E50", marginBottom: "10px", fontSize: "16px" }}>
                      🎯 Model Accuracy
                    </h3>
                    <p style={{ margin: "0", color: "#2C3E50", fontSize: "24px", fontWeight: "bold" }}>
                      {pipelineStatus.accuracy ? `${(pipelineStatus.accuracy * 100).toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>

                  <div style={{
                    backgroundColor: "#F8F9FA",
                    padding: "20px",
                    borderRadius: "15px",
                    border: "1px solid #E9ECEF"
                  }}>
                    <h3 style={{ color: "#2C3E50", marginBottom: "10px", fontSize: "16px" }}>
                      📈 Training Time
                    </h3>
                    <p style={{ margin: "0", color: "#2C3E50", fontSize: "24px", fontWeight: "bold" }}>
                      {pipelineStatus.training_time ? `${pipelineStatus.training_time.toFixed(1)}s` : 'N/A'}
                    </p>
                  </div>

                  <div style={{
                    backgroundColor: "#F8F9FA",
                    padding: "20px",
                    borderRadius: "15px",
                    border: "1px solid #E9ECEF"
                  }}>
                    <h3 style={{ color: "#2C3E50", marginBottom: "10px", fontSize: "16px" }}>
                      📊 F1 Score
                    </h3>
                    <p style={{ margin: "0", color: "#2C3E50", fontSize: "24px", fontWeight: "bold" }}>
                      {pipelineStatus.f1_score ? `${(pipelineStatus.f1_score * 100).toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                </div>

                <div style={{
                  backgroundColor: "#F8F9FA",
                  padding: "20px",
                  borderRadius: "15px",
                  border: "1px solid #E9ECEF",
                  marginBottom: "20px"
                }}>
                  <h3 style={{ color: "#2C3E50", marginBottom: "15px", fontSize: "18px" }}>
                    🤖 Model Details
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    <div>
                      <span style={{ color: "#666", fontSize: "14px" }}>Model Type:</span>
                      <p style={{ margin: "5px 0 0 0", color: "#2C3E50", fontSize: "16px", fontWeight: "bold" }}>
                        {pipelineStatus.model || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "#666", fontSize: "14px" }}>Features Used:</span>
                      <p style={{ margin: "5px 0 0 0", color: "#2C3E50", fontSize: "16px", fontWeight: "bold" }}>
                        {pipelineStatus.features_count || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "15px",
                  flexWrap: "wrap"
                }}>
                  <button
                    onClick={getPipelineStatus}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "#3498DB",
                      color: "white",
                      border: "none",
                      borderRadius: "25px",
                      fontSize: "14px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 15px rgba(52, 152, 219, 0.3)"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 20px rgba(52, 152, 219, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 15px rgba(52, 152, 219, 0.3)";
                    }}
                  >
                    🔄 Refresh Status
                  </button>
                  <button
                    onClick={runPipeline}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "#9B59B6",
                      color: "white",
                      border: "none",
                      borderRadius: "25px",
                      fontSize: "14px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 15px rgba(155, 89, 182, 0.3)"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 20px rgba(155, 89, 182, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 15px rgba(155, 89, 182, 0.3)";
                    }}
                  >
                    {pipelineRunning ? "Running..." : "Run Pipeline"}
                  </button>
                </div>
                {pipelineError && (
                  <p style={{ marginTop: "16px", textAlign: "center", color: "#C0392B", fontWeight: "bold" }}>
                    {pipelineError}
                  </p>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔄</div>
                <h3 style={{ color: "#2C3E50", marginBottom: "10px" }}>Loading Pipeline Status...</h3>
                <p style={{ color: "#666" }}>Please wait while we fetch the latest pipeline information.</p>
              </div>
            )}
          </div>
      </>
      );
          default:
            return null;
        }
      })()}
    </div>
  );
}

export default App;
