import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from database import SessionLocal
from scraper import run_scraper

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

def scheduled_scrape():
    logger.info("Running scheduled BOAMP scrape...")
    db = SessionLocal()
    try:
        result = run_scraper(db)
        logger.info(f"Scheduled scrape result: {result}")
    except Exception as e:
        logger.error(f"Scheduled scrape failed: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(
        scheduled_scrape,
        trigger=CronTrigger(hour=6, minute=0),  # Every day at 6:00 AM
        id="boamp_scrape",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — BOAMP scrape scheduled daily at 06:00")

def stop_scheduler():
    scheduler.shutdown()
