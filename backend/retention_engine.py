import pandas as pd
import numpy as np

class RetentionEngine:
    """
    Provides retention strategy recommendations based on churn risk and CLV.
    """

    def __init__(self, churn_threshold_high=0.7, churn_threshold_medium=0.4,
                 clv_threshold_high=1000):
        """
        Initialize the retention engine.

        Args:
            churn_threshold_high (float): Threshold for high churn risk
            churn_threshold_medium (float): Threshold for medium churn risk
            clv_threshold_high (float): Threshold for high CLV
        """
        self.churn_threshold_high = churn_threshold_high
        self.churn_threshold_medium = churn_threshold_medium
        self.clv_threshold_high = clv_threshold_high

    def categorize_customers(self, df, churn_prob_col='churn_probability', clv_col='clv'):
        """
        Categorize customers based on churn risk and CLV.

        Args:
            df (pd.DataFrame): Dataframe with churn probabilities and CLV
            churn_prob_col (str): Column name for churn probability
            clv_col (str): Column name for CLV

        Returns:
            pd.DataFrame: Dataframe with risk and value categories
        """
        df = df.copy()

        # Categorize churn risk
        conditions = [
            (df[churn_prob_col] >= self.churn_threshold_high),
            (df[churn_prob_col] >= self.churn_threshold_medium),
            (df[churn_prob_col] < self.churn_threshold_medium)
        ]
        choices = ['High', 'Medium', 'Low']
        df['churn_risk'] = np.select(conditions, choices, default='Low')

        # Categorize CLV
        df['clv_category'] = np.where(df[clv_col] >= self.clv_threshold_high, 'High', 'Low')

        return df

    def recommend_actions(self, df):
        """
        Recommend retention actions for each customer.

        Args:
            df (pd.DataFrame): Dataframe with categorized customers

        Returns:
            pd.DataFrame: Dataframe with recommended actions
        """
        df = df.copy()

        # Define action mapping
        action_map = {
            ('High', 'High'): 'Premium Retention Package - Offer significant discount + personalized service',
            ('High', 'Low'): 'Basic Retention Plan - Offer small discount + loyalty points',
            ('Medium', 'High'): 'Targeted Engagement - Send personalized offers + proactive outreach',
            ('Medium', 'Low'): 'Monitor Closely - Track behavior + send occasional offers',
            ('Low', 'High'): 'VIP Treatment - Maintain high satisfaction + upsell opportunities',
            ('Low', 'Low'): 'No Action Required - Customer stable'
        }

        # Apply recommendations
        df['recommended_action'] = df.apply(
            lambda row: action_map.get((row['churn_risk'], row['clv_category']),
                                     'Review Manually - Unusual combination'),
            axis=1
        )

        return df

    def calculate_priority_score(self, df, churn_prob_col='churn_probability', clv_col='clv'):
        """
        Calculate priority score for intervention (higher = more urgent).

        Args:
            df (pd.DataFrame): Dataframe with churn prob and CLV

        Returns:
            pd.DataFrame: Dataframe with priority scores
        """
        df = df.copy()

        # Normalize CLV and churn probability
        df['clv_normalized'] = (df[clv_col] - df[clv_col].min()) / (df[clv_col].max() - df[clv_col].min())
        df['churn_normalized'] = df[churn_prob_col]

        # Priority score: combination of churn risk and CLV value
        df['priority_score'] = df['churn_normalized'] * (1 + df['clv_normalized'])

        # Scale to 0-100
        df['priority_score'] = (df['priority_score'] - df['priority_score'].min()) / \
                              (df['priority_score'].max() - df['priority_score'].min()) * 100

        return df

    def get_retention_summary(self, df):
        """
        Generate summary statistics for retention recommendations.

        Args:
            df (pd.DataFrame): Dataframe with recommendations

        Returns:
            dict: Summary statistics
        """
        summary = {
            'total_customers': len(df),
            'high_risk_customers': len(df[df['churn_risk'] == 'High']),
            'high_value_customers': len(df[df['clv_category'] == 'High']),
            'high_risk_high_value': len(df[(df['churn_risk'] == 'High') & (df['clv_category'] == 'High')]),
            'action_distribution': df['recommended_action'].value_counts().to_dict(),
            'avg_priority_score': df['priority_score'].mean(),
            'max_priority_score': df['priority_score'].max()
        }

        return summary

    def process_customers(self, df, churn_prob_col='churn_probability', clv_col='clv'):
        """
        Complete retention analysis pipeline.

        Args:
            df (pd.DataFrame): Input dataframe with predictions and CLV

        Returns:
            pd.DataFrame: Dataframe with complete retention analysis
        """
        # Categorize customers
        df = self.categorize_customers(df, churn_prob_col, clv_col)

        # Calculate priority scores
        df = self.calculate_priority_score(df, churn_prob_col, clv_col)

        # Recommend actions
        df = self.recommend_actions(df)

        return df