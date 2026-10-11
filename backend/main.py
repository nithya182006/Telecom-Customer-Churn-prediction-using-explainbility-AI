import pandas as pd
import numpy as np
import time
from data_preprocessing import DataPreprocessor
from feature_engineering import FeatureEngineer
from model_training import ModelTrainer
from explainability import ExplainabilityAnalyzer
from retention_engine import RetentionEngine

def create_sample_data(n_customers=1000, n_months=12):
    """
    Create synthetic telecom customer data for demonstration.

    Args:
        n_customers (int): Number of customers
        n_months (int): Number of months of historical data

    Returns:
        pd.DataFrame: Synthetic dataset
    """
    np.random.seed(42)

    data = []

    for customer_id in range(n_customers):
        # Customer attributes
        age = np.random.normal(35, 10)
        tenure = np.random.exponential(24)  # Average 2 years
        avg_monthly_revenue = np.random.normal(50, 20)

        # Contract type
        contract_type = np.random.choice(['Month-to-month', 'One year', 'Two year'],
                                       p=[0.5, 0.3, 0.2])

        # Service usage
        internet_service = np.random.choice(['DSL', 'Fiber optic', 'No'], p=[0.4, 0.4, 0.2])
        phone_service = np.random.choice([True, False], p=[0.9, 0.1])

        # Churn probability (will be predicted)
        base_churn_prob = 0.2

        # Adjust based on attributes
        if contract_type == 'Month-to-month':
            base_churn_prob += 0.2
        if tenure < 6:
            base_churn_prob += 0.1
        if avg_monthly_revenue < 30:
            base_churn_prob += 0.1

        churn = np.random.binomial(1, min(base_churn_prob, 0.8))

        # Generate monthly data
        for month in range(n_months):
            # Usage patterns
            base_usage = np.random.normal(100, 20)
            if churn and month > n_months - 4:  # Churners reduce usage in last months
                usage_multiplier = 0.7 + 0.3 * (month / n_months)
            else:
                usage_multiplier = 1.0

            data_usage = base_usage * usage_multiplier

            # Complaints
            base_complaints = np.random.poisson(0.5)
            if churn and month > n_months - 3:
                complaints = base_complaints + np.random.poisson(1)
            else:
                complaints = base_complaints

            # Recharges
            base_recharges = np.random.poisson(1)
            if churn and month > n_months - 3:
                recharges = max(0, base_recharges - 1)
            else:
                recharges = base_recharges

            # Complaint text (simplified)
            complaint_texts = [
                "Service is excellent",
                "Billing issue resolved",
                "Slow internet connection",
                "Poor customer service",
                "Unexpected charges",
                ""
            ]
            complaint_text = np.random.choice(complaint_texts,
                                            p=[0.4, 0.3, 0.1, 0.1, 0.05, 0.05])

            data.append({
                'customer_id': customer_id,
                'month': month,
                'age': age,
                'tenure': tenure,
                'avg_monthly_revenue': avg_monthly_revenue,
                'contract_type': contract_type,
                'internet_service': internet_service,
                'phone_service': phone_service,
                'data_usage': data_usage,
                'complaints': complaints,
                'recharges': recharges,
                'complaint_text': complaint_text,
                'churn': churn
            })

    return pd.DataFrame(data)

def prepare_features_for_modeling(df):
    """
    Prepare the dataset for modeling by aggregating monthly data to customer level.

    Args:
        df (pd.DataFrame): Monthly customer data

    Returns:
        pd.DataFrame: Customer-level features
    """
    # Get latest month data for each customer
    latest_data = df.sort_values(['customer_id', 'month']).groupby('customer_id').last().reset_index()

    # Aggregate features
    agg_features = df.groupby('customer_id').agg({
        'data_usage': ['mean', 'std', 'min', 'max'],
        'complaints': ['sum', 'mean'],
        'recharges': ['sum', 'mean'],
        'month': 'count'  # Number of months
    }).reset_index()

    # Flatten column names
    agg_features.columns = ['customer_id'] + [f"{col[0]}_{col[1]}" for col in agg_features.columns[1:]]

    # Merge with latest data
    final_df = latest_data.merge(agg_features, on='customer_id', how='left')

    # Select features for modeling
    feature_cols = [
        'age', 'tenure', 'avg_monthly_revenue',
        'contract_type', 'internet_service', 'phone_service',
        'data_usage_mean', 'data_usage_std', 'data_usage_min', 'data_usage_max',
        'complaints_sum', 'complaints_mean',
        'recharges_sum', 'recharges_mean',
        'sentiment_score', 'clv',
        'usage_trend', 'complaints_increase', 'recharge_trend'
    ]

    # Keep only available columns
    available_cols = [col for col in feature_cols if col in final_df.columns]
    available_cols.append('churn')

    return final_df[available_cols]

def real_time_simulation(model, preprocessor, feature_engineer, retention_engine,
                        initial_data, n_updates=10):
    """
    Simulate real-time data updates and predictions.

    Args:
        model: Trained model
        preprocessor: Fitted preprocessor
        feature_engineer: Feature engineer
        retention_engine: Retention engine
        initial_data (pd.DataFrame): Initial customer data
        n_updates (int): Number of simulation updates
    """
    print("\n=== Real-time Churn Prediction Simulation ===")

    current_data = initial_data.copy()

    for update in range(n_updates):
        print(f"\nUpdate {update + 1}/{n_updates}")

        # Simulate data changes (new month)
        # Add some random changes to simulate real-time updates
        changes = np.random.normal(0, 5, len(current_data))
        current_data['data_usage'] += changes

        # Add some complaints
        new_complaints = np.random.poisson(0.1, len(current_data))
        current_data['complaints'] += new_complaints

        # Update month
        current_data['month'] += 1

        # Re-engineer features
        current_data = feature_engineer.engineer_features(current_data)

        # Prepare for modeling
        model_data = prepare_features_for_modeling(current_data)

        # Preprocess
        X = model_data.drop('churn', axis=1)
        X_processed = preprocessor.transform(X)

        # Predict
        churn_probs = model.predict_proba(X_processed)[:, 1]
        model_data['churn_probability'] = churn_probs

        # Apply retention engine
        retention_data = retention_engine.process_customers(model_data)

        # Summary
        high_risk = (retention_data['churn_risk'] == 'High').sum()
        print(f"High-risk customers: {high_risk}")
        print(f"Average churn probability: {churn_probs.mean():.3f}")

        time.sleep(1)  # Simulate time delay

def main():
    """
    Main execution function for the churn prediction pipeline.
    """
    print("=== Telecom Customer Churn Prediction System ===")

    # 1. Create sample data
    print("\n1. Creating sample data...")
    raw_data = create_sample_data(n_customers=1000, n_months=6)
    print(f"Created dataset with {len(raw_data)} records for {raw_data['customer_id'].nunique()} customers")

    # 2. Feature engineering
    print("\n2. Engineering features...")
    feature_engineer = FeatureEngineer()
    engineered_data = feature_engineer.engineer_features(raw_data)
    print("Feature engineering completed")

    # 3. Prepare data for modeling
    print("\n3. Preparing data for modeling...")
    model_data = prepare_features_for_modeling(engineered_data)
    print(f"Prepared {model_data.shape[0]} customer records with {model_data.shape[1]} features")

    # 4. Preprocessing
    print("\n4. Preprocessing data...")
    preprocessor = DataPreprocessor()
    X = model_data.drop('churn', axis=1)
    y = model_data['churn']

    X_processed = preprocessor.fit_transform(X)
    print(f"Preprocessed data shape: {X_processed.shape}")

    # 5. Model training
    print("\n5. Training models...")
    trainer = ModelTrainer()
    results = trainer.train_models(X_processed, y)

    # Get best model
    best_model_name, best_model, best_metrics = trainer.get_best_model('roc_auc')
    print(f"\nBest model: {best_model_name} (ROC-AUC: {best_metrics['roc_auc']:.4f})")

    # 6. Explainability
    print("\n6. Analyzing model explainability...")
    explainer = ExplainabilityAnalyzer()
    explainer.set_model(best_model, X_processed)

    # Plot feature importance
    try:
        explainer.plot_feature_importance(X_processed, max_features=15, save_path='feature_importance.png')
    except Exception as e:
        print(f"Could not create feature importance plot: {e}")

    # Explain a specific customer
    sample_customer_raw = X.iloc[:1]
    sample_customer_processed = preprocessor.transform(sample_customer_raw)
    explanation = explainer.get_customer_explanation(sample_customer_processed, customer_id=0)
    print(f"\nSample customer explanation:")
    print(f"Churn probability: {explanation['churn_probability']:.3f}")
    print("Top reasons:")
    for reason in explanation['top_reasons'][:3]:
        print(f"  - {reason}")

    # 7. Retention strategy
    print("\n7. Applying retention strategies...")
    retention_engine = RetentionEngine()

    # Add predictions to data
    model_data['churn_probability'] = best_model.predict_proba(X_processed)[:, 1]
    retention_data = retention_engine.process_customers(model_data)

    summary = retention_engine.get_retention_summary(retention_data)
    print(f"\nRetention Summary:")
    print(f"Total customers: {summary['total_customers']}")
    print(f"High-risk customers: {summary['high_risk_customers']}")
    print(f"High-value customers: {summary['high_value_customers']}")
    print(f"High-risk, high-value: {summary['high_risk_high_value']}")

    # 8. Real-time simulation
    print("\n8. Running real-time simulation...")
    real_time_simulation(best_model, preprocessor, feature_engineer, retention_engine,
                        engineered_data, n_updates=5)

    # Save the best model
    trainer.save_model(best_model_name, 'models/best_churn_model.pkl')

    print("\n=== Pipeline completed successfully! ===")

if __name__ == "__main__":
    main()