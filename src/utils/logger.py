#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import logging
from datetime import datetime

def setup_logger(name='settlement_prediction', log_level=logging.INFO):
    """
    Set up and return a logger with the specified name and log level.
    
    Parameters:
    -----------
    name : str, optional
        Name for the logger. Default is 'settlement_prediction'.
    log_level : int, optional
        Logging level. Default is logging.INFO.
    
    Returns:
    --------
    logging.Logger
        Configured logger instance.
    """
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Set up logger
    logger = logging.getLogger(name)
    logger.setLevel(log_level)
    
    # Clear any existing handlers
    if logger.hasHandlers():
        logger.handlers.clear()
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    
    # Create file handler
    log_filename = f"log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    file_handler = logging.FileHandler(os.path.join('logs', log_filename))
    file_handler.setLevel(log_level)
    
    # Create formatter and add to handlers
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)
    
    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger