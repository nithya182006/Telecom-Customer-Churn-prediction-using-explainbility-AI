import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

class DataPreprocessor:
    """
    Handles data preprocessing tasks including missing value imputation,
    categorical encoding, and numerical scaling.
    """

    def __init__(self, categorical_cols=None, numerical_cols=None):
        """
        Initialize the preprocessor.

        Args:
            categorical_cols (list): List of categorical column names
            numerical_cols (list): List of numerical column names
        """
        self.categorical_cols = categorical_cols or []
        self.numerical_cols = numerical_cols or []
        self.preprocessor = None
        self.scaler = StandardScaler()

    def fit(self, df):
        """
        Fit the preprocessing pipeline on the data.

        Args:
            df (pd.DataFrame): Input dataframe
        """
        # Identify column types if not provided
        if not self.categorical_cols or not self.numerical_cols:
            self._identify_columns(df)

        # Create preprocessing pipeline
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])

        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='most_frequent')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])

        self.preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, self.numerical_cols),
                ('cat', categorical_transformer, self.categorical_cols)
            ]
        )

        # Fit the preprocessor
        self.preprocessor.fit(df)

    def transform(self, df):
        """
        Transform the data using the fitted preprocessor.

        Args:
            df (pd.DataFrame): Input dataframe

        Returns:
            pd.DataFrame: Preprocessed dataframe
        """
        if self.preprocessor is None:
            raise ValueError("Preprocessor not fitted. Call fit() first.")

        # Transform data
        transformed = self.preprocessor.transform(df)

        # Get feature names
        feature_names = self._get_feature_names()

        return pd.DataFrame(transformed, columns=feature_names, index=df.index)

    def fit_transform(self, df):
        """
        Fit and transform the data.

        Args:
            df (pd.DataFrame): Input dataframe

        Returns:
            pd.DataFrame: Preprocessed dataframe
        """
        self.fit(df)
        return self.transform(df)

    def _identify_columns(self, df):
        """
        Automatically identify categorical and numerical columns.

        Args:
            df (pd.DataFrame): Input dataframe
        """
        # Consider object and category dtypes as categorical
        self.categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

        # Consider numerical dtypes as numerical, excluding target if present
        potential_num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        self.numerical_cols = [col for col in potential_num_cols if col != 'churn']

    def _get_feature_names(self):
        """
        Get feature names after transformation.

        Returns:
            list: List of feature names
        """
        if self.preprocessor is None:
            return []

        # Get numerical feature names (unchanged)
        num_features = self.numerical_cols

        # Get categorical feature names (one-hot encoded)
        cat_encoder = self.preprocessor.named_transformers_['cat']['onehot']
        cat_features = []
        for i, col in enumerate(self.categorical_cols):
            categories = cat_encoder.categories_[i]
            cat_features.extend([f"{col}_{cat}" for cat in categories])

        return num_features + cat_features