from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
from data_preprocessing import DataPreprocessor
from feature_engineering import FeatureEngineer
from explainability import ExplainabilityAnalyzer
from retention_engine import RetentionEngine
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Global variables to store trained components
preprocessor = None
feature_engineer = None
model = None
explainer = None
retention_engine = None
pipeline_status = {
    'status': 'not_started',
    'message': 'Pipeline has not run yet'
}

def initialize_components():
    """Initialize and load trained components."""
    global preprocessor, feature_engineer, model, explainer, retention_engine, pipeline_status

    try:
        # Load preprocessor, feature engineer, and model
        # For now, we'll train them on the fly, but in production you'd load saved models
        from main import create_sample_data, prepare_features_for_modeling
        from model_training import ModelTrainer

        # Create sample data and train
        raw_data = create_sample_data(n_customers=100, n_months=6)  # Smaller for API
        feature_engineer = FeatureEngineer()
        engineered_data = feature_engineer.engineer_features(raw_data)
        model_data = prepare_features_for_modeling(engineered_data)

        # Preprocessing
        preprocessor = DataPreprocessor()
        X = model_data.drop('churn', axis=1)
        y = model_data['churn']
        X_processed = preprocessor.fit_transform(X)

        # Train model
        trainer = ModelTrainer()
        results = trainer.train_models(X_processed, y)
        best_model_name, model, best_metrics = trainer.get_best_model('roc_auc')

        # Initialize explainer
        explainer = ExplainabilityAnalyzer()
        explainer.set_model(model, X_processed)

        # Initialize retention engine
        retention_engine = RetentionEngine()

        pipeline_status = {
            'status': 'completed',
            'message': 'ML pipeline executed successfully',
            'model': best_model_name,
            'accuracy': float(best_metrics.get('accuracy', 0)),
            'precision': float(best_metrics.get('precision', 0)),
            'recall': float(best_metrics.get('recall', 0)),
            'f1_score': float(best_metrics.get('f1_score', 0)),
            'roc_auc': float(best_metrics.get('roc_auc', 0)),
            'features_count': len(X.columns),
            'totalCustomers': int(model_data.shape[0]),
            'highRiskCustomers': int((model.predict_proba(X_processed)[:, 1] > 0.5).sum())
        }

        print("Components initialized successfully")

    except Exception as e:
        pipeline_status = {
            'status': 'failed',
            'message': f'Pipeline initialization failed: {str(e)}'
        }
        print(f"Error initializing components: {e}")

def _normalize_contract(contract_value):
    """Map UI contract labels to training labels when possible."""
    if not contract_value:
        return contract_value

    contract_map = {
        'One Year': 'One year',
        'Two Year': 'Two year'
    }
    return contract_map.get(contract_value, contract_value)

def _build_prediction_frame(payload):
    """
    Build an input dataframe that matches the fitted preprocessor schema.
    Missing fields are filled with neutral defaults.
    """
    if preprocessor is None:
        raise ValueError("Preprocessor is not initialized")

    expected_numeric = preprocessor.numerical_cols
    expected_categorical = preprocessor.categorical_cols

    row = {}

    for col in expected_numeric:
        row[col] = 0.0

    for col in expected_categorical:
        row[col] = 'Unknown'

    monthly_charges = float(payload.get('monthlyCharges', 0) or 0)
    tenure = float(payload.get('tenure', 0) or 0)

    numeric_mapping = {
        'age': float(payload.get('age', 0) or 0),
        'tenure': tenure,
        'avg_monthly_revenue': monthly_charges,
        'monthlyCharges': monthly_charges,
        'clv': monthly_charges * tenure,
        'sentiment_score': 0.5
    }

    categorical_mapping = {
        'contract_type': _normalize_contract(payload.get('contract')),
        'internet_service': payload.get('internetService', 'Unknown'),
        'contract': _normalize_contract(payload.get('contract')),
        'internetService': payload.get('internetService', 'Unknown'),
        'onlineSecurity': payload.get('onlineSecurity', 'Unknown'),
        'paymentMethod': payload.get('paymentMethod', 'Unknown'),
        'phone_service': payload.get('internetService', 'No') != 'No'
    }

    for key, value in numeric_mapping.items():
        if key in row:
            row[key] = value

    for key, value in categorical_mapping.items():
        if key in row and value is not None:
            row[key] = value

    ordered_columns = expected_numeric + expected_categorical
    return pd.DataFrame([{col: row[col] for col in ordered_columns}])

def _to_json_safe(value):
    """Recursively convert numpy/pandas scalar types to JSON-safe Python types."""
    if isinstance(value, dict):
        return {k: _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_json_safe(v) for v in value]
    if isinstance(value, tuple):
        return [_to_json_safe(v) for v in value]
    if isinstance(value, np.generic):
        return value.item()
    return value

def generate_specific_advice(customer, original_data):
    """Generate specific retention advice based on customer profile."""
    advice = []

    churn_risk = customer['churn_risk']
    clv_category = customer['clv_category']

    # High risk customers
    if churn_risk == 'High':
        if clv_category == 'High':
            advice.extend([
                "Immediate personalized outreach required - this high-value customer needs urgent attention",
                "Offer premium retention package: 30% discount for 6 months + dedicated account manager",
                "Schedule phone call within 24 hours to understand their concerns",
                "Consider upgrading their service plan with additional features at no extra cost"
            ])
        else:
            advice.extend([
                "Offer basic retention incentives: 15% discount for 3 months",
                "Send personalized email with loyalty rewards",
                "Review billing history for any issues",
                "Consider switching to automatic payment to reduce churn risk"
            ])

        # Specific advice based on features
        if original_data.get('contract') == 'Month-to-month':
            advice.append("Strongly recommend switching to annual contract with discount")
        if original_data.get('onlineSecurity') == 'No':
            advice.append("Offer free security suite for 6 months")
        if original_data.get('tenure', 0) < 6:
            advice.append("Focus on building relationship - send welcome package")

    elif churn_risk == 'Medium':
        if clv_category == 'High':
            advice.extend([
                "Monitor closely and engage proactively",
                "Send personalized offers based on usage patterns",
                "Schedule quarterly check-in calls",
                "Consider loyalty program enrollment"
            ])
        else:
            advice.extend([
                "Track behavior and send occasional offers",
                "Monitor for changes in usage patterns",
                "Send satisfaction surveys periodically"
            ])

    else:  # Low risk
        if clv_category == 'High':
            advice.extend([
                "Maintain high satisfaction levels",
                "Look for upsell opportunities",
                "Send VIP treatment communications",
                "Consider premium service upgrades"
            ])
        else:
            advice.append("Customer stable - no immediate action required")

    return advice

def calculate_potential_savings(customer, original_data):
    """Calculate potential savings from retention."""
    monthly_charges = original_data.get('monthlyCharges', 0)
    tenure = original_data.get('tenure', 0)
    churn_prob = customer.get('churn_probability', 0)

    # Estimated lifetime value if retained
    estimated_lifetime_months = 24  # Assume 2 years if retained
    potential_revenue = monthly_charges * estimated_lifetime_months

    # Retention success probability (simplified)
    retention_success_rate = 0.7 if customer['churn_risk'] == 'High' else 0.8

    # Expected savings
    expected_savings = potential_revenue * churn_prob * retention_success_rate

    return {
        'potentialRevenue': float(potential_revenue),
        'expectedSavings': float(expected_savings),
        'retentionSuccessRate': retention_success_rate
    }

@app.route('/api/predict', methods=['POST'])
def predict_churn():
    """Predict churn probability for a customer."""
    try:
        if preprocessor is None or model is None:
            return jsonify({'error': 'Model components are not initialized'}), 503

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request JSON body is required'}), 400

        X = _build_prediction_frame(data)

        # Preprocess
        X_processed = preprocessor.transform(X)

        # Predict
        churn_prob = model.predict_proba(X_processed)[0][1]

        # Get explanation
        explanation = None
        if explainer is not None:
            explanation = explainer.get_churn_reasons_and_advice(
                X_processed, customer_id=data.get('customerId')
            )
            explanation = _to_json_safe(explanation)

        return jsonify({
            'churnProbability': float(churn_prob),
            'prediction': 'High Risk' if churn_prob > 0.5 else 'Low Risk',
            'explanation': explanation
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/retention-advice', methods=['POST'])
def get_retention_advice():
    """Get retention strategies and advice for a customer."""
    try:
        data = request.get_json()

        # Calculate CLV
        clv = data.get('monthlyCharges', 0) * data.get('tenure', 0)

        # Create dataframe for retention analysis
        customer_data = pd.DataFrame([{
            'churn_probability': data.get('churnProbability', 0),
            'clv': clv,
            'customerId': data.get('customerId', ''),
            'age': data.get('age', 0),
            'tenure': data.get('tenure', 0),
            'monthlyCharges': data.get('monthlyCharges', 0),
            'contract': data.get('contract', ''),
            'internetService': data.get('internetService', ''),
            'onlineSecurity': data.get('onlineSecurity', ''),
            'paymentMethod': data.get('paymentMethod', '')
        }])

        # Process with retention engine
        retention_analysis = retention_engine.process_customers(customer_data)

        # Get retention advice based on risk and value
        customer = retention_analysis.iloc[0]

        # Generate specific advice based on customer profile
        advice = generate_specific_advice(customer, data)

        return jsonify({
            'churnRisk': customer['churn_risk'],
            'clvCategory': customer['clv_category'],
            'priorityScore': float(customer['priority_score']),
            'recommendedAction': customer['recommended_action'],
            'specificAdvice': advice,
            'estimatedSavings': calculate_potential_savings(customer, data)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pipeline-status', methods=['GET'])
def get_pipeline_status():
    """Get the status of the ML pipeline."""
    try:
        return jsonify(pipeline_status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/run-pipeline', methods=['POST'])
def run_pipeline():
    """Run the complete ML pipeline."""
    global pipeline_status
    try:
        pipeline_status = {
            'status': 'running',
            'message': 'Pipeline execution started'
        }

        initialize_components()
        return jsonify(pipeline_status)
    except Exception as e:
        pipeline_status = {
            'status': 'failed',
            'message': f'Pipeline execution failed: {str(e)}'
        }
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    initialize_components()
    app.run(debug=True, port=5000)
