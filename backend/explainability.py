import pandas as pd
import numpy as np
import shap
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.base import BaseEstimator

class ExplainabilityAnalyzer:
    """
    Provides explainable AI capabilities using SHAP for churn prediction models.
    """

    def __init__(self, model=None, X_train=None):
        """
        Initialize the explainability analyzer.

        Args:
            model: Trained model to explain
            X_train: Training data for SHAP explainer
        """
        self.model = model
        self.X_train = X_train
        self.explainer = None

    def set_model(self, model, X_train=None):
        """
        Set the model and training data for explanation.

        Args:
            model: Trained model
            X_train: Training data
        """
        self.model = model
        self.X_train = X_train

        # Initialize SHAP explainer
        if hasattr(model, 'predict_proba'):
            if hasattr(model, 'feature_importances_'):  # Tree-based models
                self.explainer = shap.TreeExplainer(model)
            else:  # Linear models or others
                self.explainer = shap.Explainer(model, X_train)
        else:
            raise ValueError("Model must have predict_proba method")

    def explain_prediction(self, X_instance, max_features=10):
        """
        Explain a single prediction.

        Args:
            X_instance (pd.DataFrame or np.array): Single instance to explain
            max_features (int): Maximum number of features to show

        Returns:
            dict: Explanation results
        """
        if self.explainer is None:
            raise ValueError("Explainer not initialized. Call set_model() first.")

        # Calculate SHAP values
        shap_values = self.explainer(X_instance)

        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # For binary classification, take positive class

        # Get feature importance for this instance
        feature_importance = pd.DataFrame({
            'feature': X_instance.columns if hasattr(X_instance, 'columns') else [f'feature_{i}' for i in range(len(X_instance.columns))],
            'shap_value': shap_values.values[0] if len(shap_values.values.shape) > 1 else shap_values.values,
            'feature_value': X_instance.iloc[0] if hasattr(X_instance, 'iloc') else X_instance[0]
        })

        # Sort by absolute SHAP value
        feature_importance['abs_shap'] = feature_importance['shap_value'].abs()
        feature_importance = feature_importance.sort_values('abs_shap', ascending=False).head(max_features)

        return {
            'feature_importance': feature_importance,
            'shap_values': shap_values,
            'prediction': self.model.predict_proba(X_instance)[0][1]
        }

    def plot_feature_importance(self, X_test, max_features=20, save_path=None):
        """
        Plot global feature importance.

        Args:
            X_test: Test data
            max_features (int): Maximum number of features to show
            save_path (str): Path to save the plot
        """
        if self.explainer is None:
            raise ValueError("Explainer not initialized. Call set_model() first.")

        # Calculate SHAP values for test set
        shap_values = self.explainer(X_test)

        if isinstance(shap_values, list):
            shap_values = shap_values[1]

        # Plot summary plot
        plt.figure(figsize=(10, 8))
        shap.summary_plot(shap_values, X_test, max_display=max_features, show=False)

        if save_path:
            plt.savefig(save_path, bbox_inches='tight')
            print(f"Feature importance plot saved to {save_path}")
        else:
            plt.show()

    def plot_waterfall(self, X_instance, save_path=None):
        """
        Plot waterfall plot for a single prediction.

        Args:
            X_instance: Single instance
            save_path (str): Path to save the plot
        """
        if self.explainer is None:
            raise ValueError("Explainer not initialized. Call set_model() first.")

        # Calculate SHAP values
        shap_values = self.explainer(X_instance)

        if isinstance(shap_values, list):
            shap_values = shap_values[1]

        # Plot waterfall
        plt.figure(figsize=(10, 6))
        shap.plots.waterfall(shap_values[0], show=False)

        if save_path:
            plt.savefig(save_path, bbox_inches='tight')
            print(f"Waterfall plot saved to {save_path}")
        else:
            plt.show()

    def get_customer_explanation(self, customer_data, customer_id=None):
        """
        Get detailed explanation for a specific customer.

        Args:
            customer_data (pd.DataFrame): Customer data (single row)
            customer_id: Customer identifier

        Returns:
            dict: Detailed explanation
        """
        explanation = self.explain_prediction(customer_data)

        # Create human-readable explanation
        top_features = explanation['feature_importance'].head(5)

        reasons = []
        for _, row in top_features.iterrows():
            feature = row['feature']
            value = row['feature_value']
            shap_val = row['shap_value']

            if shap_val > 0:
                reasons.append(f"High {feature} ({value:.2f}) increases churn risk")
            else:
                reasons.append(f"Low {feature} ({value:.2f}) decreases churn risk")

        return {
            'customer_id': customer_id,
            'churn_probability': explanation['prediction'],
            'top_reasons': reasons,
            'feature_details': explanation['feature_importance']
        }

    def get_churn_reasons_and_advice(self, customer_data, customer_id=None):
        """
        Get specific churn reasons and personalized retention advice.

        Args:
            customer_data (pd.DataFrame): Customer data (single row)
            customer_id: Customer identifier

        Returns:
            dict: Churn reasons and retention advice
        """
        explanation = self.explain_prediction(customer_data)

        # Define feature to reason mapping
        feature_reason_map = {
            'tenure': {
                'low': "Short tenure indicates customer is still evaluating the service",
                'high': "Long tenure suggests customer is generally satisfied"
            },
            'monthlyCharges': {
                'high': "High monthly charges may be perceived as poor value",
                'low': "Reasonable pricing helps maintain customer satisfaction"
            },
            'totalCharges': {
                'low': "Low total spending suggests limited commitment",
                'high': "High total investment indicates strong loyalty"
            },
            'contract': {
                'month_to_month': "Month-to-month contracts offer flexibility but increase churn risk",
                'long_term': "Long-term contracts provide stability and reduce churn"
            },
            'internetService': {
                'fiber_optic': "Fiber optic service is premium but may be expensive",
                'dsl': "DSL is more affordable but slower"
            },
            'onlineSecurity': {
                'no': "Lack of security services increases vulnerability concerns",
                'yes': "Security services provide peace of mind"
            },
            'age': {
                'young': "Younger customers may be more price-sensitive",
                'older': "Older customers tend to be more loyal once committed"
            },
            'paymentMethod': {
                'credit_card': "Credit card payments are convenient",
                'other': "Alternative payment methods may indicate preferences"
            }
        }

        # Extract churn reasons and advice
        churn_reasons = []
        retention_advice = []
        top_features = explanation['feature_importance'].head(6)

        for _, row in top_features.iterrows():
            feature = row['feature']
            value = row['feature_value']
            shap_val = row['shap_value']

            if shap_val > 0:  # Feature contributes to churn
                reason = self._get_churn_reason(feature, value, feature_reason_map)
                advice = self._get_retention_advice(feature, value, customer_data)

                if reason:
                    churn_reasons.append({
                        'reason': reason,
                        'feature': feature,
                        'impact': 'high' if shap_val > 0.1 else 'medium',
                        'severity': shap_val
                    })

                if advice:
                    retention_advice.append({
                        'advice': advice,
                        'feature': feature,
                        'priority': 'high' if shap_val > 0.1 else 'medium'
                    })

        # Sort by impact
        churn_reasons.sort(key=lambda x: x['severity'], reverse=True)
        retention_advice.sort(key=lambda x: x.get('priority') == 'high', reverse=True)

        return {
            'customer_id': customer_id,
            'churn_probability': explanation['prediction'],
            'churn_reasons': churn_reasons[:4],  # Top 4 reasons
            'retention_advice': retention_advice[:5],  # Top 5 advice items
            'risk_level': 'High' if explanation['prediction'] > 0.7 else 'Medium' if explanation['prediction'] > 0.4 else 'Low'
        }

    def _get_churn_reason(self, feature, value, reason_map):
        """Get specific churn reason based on feature and value."""
        if feature == 'tenure':
            if value < 6:
                return "Recent customer - still in evaluation phase"
            elif value < 12:
                return "Short-term customer - building loyalty"
        elif feature == 'monthlyCharges':
            if value > 80:
                return "High monthly charges creating financial pressure"
            elif value > 60:
                return "Above-average charges may seem expensive"
        elif feature == 'totalCharges':
            if value < 500:
                return "Low total investment suggests limited commitment"
        elif feature == 'contract':
            if str(value).lower() in ['month-to-month', 'month_to_month']:
                return "Month-to-month contract allows easy switching"
        elif feature == 'internetService':
            if str(value).lower() == 'fiber_optic':
                return "Premium fiber service may be too expensive for needs"
        elif feature == 'onlineSecurity':
            if str(value).lower() == 'no':
                return "Lack of security services increases vulnerability concerns"
        elif feature == 'age':
            if value < 30:
                return "Young customers often shop for better deals"
        elif feature == 'paymentMethod':
            if str(value).lower() not in ['credit card', 'credit_card']:
                return "Payment method preferences may indicate satisfaction issues"

        return f"Unfavorable {feature} conditions"

    def _get_retention_advice(self, feature, value, customer_data):
        """Get specific retention advice based on feature and value."""
        if feature == 'tenure':
            if value < 6:
                return "Focus on onboarding experience and relationship building"
            elif value < 12:
                return "Provide loyalty rewards and personalized service"
        elif feature == 'monthlyCharges':
            if value > 80:
                return "Consider offering discounted plans or bundled services"
            elif value > 60:
                return "Highlight value proposition and service benefits"
        elif feature == 'totalCharges':
            if value < 500:
                return "Encourage service upgrades to increase investment"
        elif feature == 'contract':
            if str(value).lower() in ['month-to-month', 'month_to_month']:
                return "Offer contract incentives: 6-12 months free or discounted"
        elif feature == 'internetService':
            if str(value).lower() == 'fiber_optic':
                return "Bundle with additional services to justify premium pricing"
        elif feature == 'onlineSecurity':
            if str(value).lower() == 'no':
                return "Offer free security suite for 3-6 months"
        elif feature == 'age':
            if value < 30:
                return "Provide competitive pricing and flexible payment options"
        elif feature == 'paymentMethod':
            return "Ensure smooth billing experience and payment flexibility"

        return f"Address {feature} concerns through personalized communication"