import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from xgboost import XGBClassifier
import joblib
import os

class ModelTrainer:
    """
    Handles training and evaluation of churn prediction models.
    """

    def __init__(self, models=None, random_state=42):
        """
        Initialize the model trainer.

        Args:
            models (dict): Dictionary of model names to model instances
            random_state (int): Random state for reproducibility
        """
        self.random_state = random_state
        self.models = models or {
            'LogisticRegression': LogisticRegression(random_state=random_state, max_iter=1000),
            'RandomForest': RandomForestClassifier(random_state=random_state, n_estimators=100),
            'XGBoost': XGBClassifier(random_state=random_state, eval_metric='logloss')
        }
        self.trained_models = {}
        self.results = {}

    def train_models(self, X, y, test_size=0.2):
        """
        Train all models and evaluate performance.

        Args:
            X (pd.DataFrame or np.array): Feature matrix
            y (pd.Series or np.array): Target vector
            test_size (float): Test set size

        Returns:
            dict: Dictionary of model results
        """
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=y
        )

        print(f"Training set size: {X_train.shape[0]}")
        print(f"Test set size: {X_test.shape[0]}")

        for name, model in self.models.items():
            print(f"\nTraining {name}...")

            # Train model
            model.fit(X_train, y_train)
            self.trained_models[name] = model

            # Make predictions
            y_pred = model.predict(X_test)
            y_pred_proba = model.predict_proba(X_test)[:, 1]

            # Calculate metrics
            metrics = {
                'accuracy': accuracy_score(y_test, y_pred),
                'precision': precision_score(y_test, y_pred),
                'recall': recall_score(y_test, y_pred),
                'f1_score': f1_score(y_test, y_pred),
                'roc_auc': roc_auc_score(y_test, y_pred_proba)
            }

            self.results[name] = metrics

            print(f"  Accuracy: {metrics['accuracy']:.4f}")
            print(f"  Precision: {metrics['precision']:.4f}")
            print(f"  Recall: {metrics['recall']:.4f}")
            print(f"  F1 Score: {metrics['f1_score']:.4f}")
            print(f"  ROC-AUC: {metrics['roc_auc']:.4f}")

        return self.results

    def get_best_model(self, metric='roc_auc'):
        """
        Get the best performing model based on a metric.

        Args:
            metric (str): Metric to use for selection

        Returns:
            tuple: (model_name, model, metrics)
        """
        if not self.results:
            raise ValueError("No models trained. Call train_models() first.")

        best_model_name = max(self.results, key=lambda x: self.results[x][metric])
        return best_model_name, self.trained_models[best_model_name], self.results[best_model_name]

    def cross_validate(self, X, y, cv=5, metric='roc_auc'):
        """
        Perform cross-validation for all models.

        Args:
            X (pd.DataFrame or np.array): Feature matrix
            y (pd.Series or np.array): Target vector
            cv (int): Number of cross-validation folds
            metric (str): Metric to evaluate

        Returns:
            dict: Cross-validation results
        """
        cv_results = {}

        for name, model in self.models.items():
            if metric == 'roc_auc':
                scores = cross_val_score(model, X, y, cv=cv, scoring='roc_auc')
            elif metric == 'accuracy':
                scores = cross_val_score(model, X, y, cv=cv, scoring='accuracy')
            elif metric == 'f1':
                scores = cross_val_score(model, X, y, cv=cv, scoring='f1')
            else:
                scores = cross_val_score(model, X, y, cv=cv, scoring='accuracy')

            cv_results[name] = {
                'mean': scores.mean(),
                'std': scores.std(),
                'scores': scores
            }

            print(f"{name} CV {metric}: {scores.mean():.4f} (+/- {scores.std() * 2:.4f})")

        return cv_results

    def save_model(self, model_name, filepath):
        """
        Save a trained model to disk.

        Args:
            model_name (str): Name of the model to save
            filepath (str): Path to save the model
        """
        if model_name not in self.trained_models:
            raise ValueError(f"Model {model_name} not found.")

        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self.trained_models[model_name], filepath)
        print(f"Model saved to {filepath}")

    def load_model(self, filepath):
        """
        Load a model from disk.

        Args:
            filepath (str): Path to the saved model

        Returns:
            object: Loaded model
        """
        return joblib.load(filepath)