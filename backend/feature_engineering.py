import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler

try:
    from transformers import pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    pipeline = None

class FeatureEngineer:
    """
    Handles feature engineering including behavioral change detection,
    sentiment analysis, and CLV calculation.
    """

    def __init__(self):
        """
        Initialize the feature engineer.
        """
        # Initialize sentiment analysis pipeline if available
        if TRANSFORMERS_AVAILABLE:
            try:
                self.sentiment_analyzer = pipeline(
                    "sentiment-analysis",
                    model="nlptown/bert-base-multilingual-uncased-sentiment",
                    return_all_scores=True
                )
            except Exception as e:
                print(f"Warning: Could not load sentiment model: {e}")
                self.sentiment_analyzer = None
        else:
            print("Warning: transformers not available. Sentiment analysis will be skipped.")
            self.sentiment_analyzer = None

    def create_behavioral_features(self, df):
        """
        Create behavioral change detection features.

        Assumes data has columns: customer_id, month, data_usage, complaints, recharges

        Args:
            df (pd.DataFrame): Input dataframe with historical data

        Returns:
            pd.DataFrame: Dataframe with additional behavioral features
        """
        df = df.copy()

        # Sort by customer and month
        df = df.sort_values(['customer_id', 'month'])

        # Calculate rolling statistics (3-month window)
        window = 3

        # Usage trends
        df['usage_mean_3m'] = df.groupby('customer_id')['data_usage'].rolling(window).mean().reset_index(0, drop=True)
        df['usage_std_3m'] = df.groupby('customer_id')['data_usage'].rolling(window).std().reset_index(0, drop=True)
        df['usage_trend'] = df.groupby('customer_id')['data_usage'].diff()

        # Complaint trends
        df['complaints_cumsum'] = df.groupby('customer_id')['complaints'].cumsum()
        df['complaints_increase'] = df.groupby('customer_id')['complaints'].diff().fillna(0)

        # Recharge frequency
        df['recharge_freq_3m'] = df.groupby('customer_id')['recharges'].rolling(window).sum().reset_index(0, drop=True)
        df['recharge_trend'] = df.groupby('customer_id')['recharges'].diff()

        # Fill NaN values from rolling operations
        df = df.fillna(method='bfill').fillna(method='ffill').fillna(0)

        return df

    def calculate_clv(self, df):
        """
        Calculate Customer Lifetime Value.

        Args:
            df (pd.DataFrame): Input dataframe with avg_monthly_revenue and tenure

        Returns:
            pd.DataFrame: Dataframe with CLV column
        """
        df = df.copy()

        # Simple CLV calculation: avg_monthly_revenue * tenure
        df['clv'] = df['avg_monthly_revenue'] * df['tenure']

        return df

    def analyze_sentiment(self, df, text_column='complaint_text'):
        """
        Perform sentiment analysis on complaint text.

        Args:
            df (pd.DataFrame): Input dataframe with text column
            text_column (str): Name of the text column

        Returns:
            pd.DataFrame: Dataframe with sentiment scores
        """
        df = df.copy()

        if self.sentiment_analyzer is None:
            print("Warning: Sentiment analyzer not available. Using neutral scores.")
            df['sentiment_score'] = 0.5  # Neutral
            return df

        if text_column not in df.columns:
            print(f"Warning: {text_column} not found in dataframe. Skipping sentiment analysis.")
            df['sentiment_score'] = 0.5  # Neutral
            return df

        sentiments = []

        for text in df[text_column].fillna(''):
            if text.strip():
                try:
                    scores = self.sentiment_analyzer(text)
                    # Calculate weighted score (1-5 scale)
                    weighted_score = sum(score['score'] * (i+1) for i, score in enumerate(scores[0])) / sum(s['score'] for s in scores[0])
                    sentiments.append(weighted_score / 5.0)  # Normalize to 0-1
                except Exception as e:
                    print(f"Error analyzing sentiment: {e}")
                    sentiments.append(0.5)
            else:
                sentiments.append(0.5)  # Neutral for empty text

        df['sentiment_score'] = sentiments

        return df

    def engineer_features(self, df, include_sentiment=True, include_behavioral=True, include_clv=True):
        """
        Apply all feature engineering steps.

        Args:
            df (pd.DataFrame): Input dataframe
            include_sentiment (bool): Whether to include sentiment analysis
            include_behavioral (bool): Whether to include behavioral features
            include_clv (bool): Whether to include CLV calculation

        Returns:
            pd.DataFrame: Dataframe with engineered features
        """
        df_engineered = df.copy()

        if include_behavioral:
            df_engineered = self.create_behavioral_features(df_engineered)

        if include_clv:
            df_engineered = self.calculate_clv(df_engineered)

        if include_sentiment:
            df_engineered = self.analyze_sentiment(df_engineered)

        return df_engineered