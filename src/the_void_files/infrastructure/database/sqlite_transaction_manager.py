import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from the_void_files.infrastructure.database.sqlite_connection import open_sqlite_connection


class SqliteTransactionManager:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path

    @contextmanager
    def open_autocommit_connection(self) -> Iterator[sqlite3.Connection]:
        connection = open_sqlite_connection(self.database_path)
        try:
            yield connection
        finally:
            connection.close()

    @contextmanager
    def open_write_transaction(self) -> Iterator[sqlite3.Connection]:
        connection = open_sqlite_connection(self.database_path)
        try:
            connection.execute("BEGIN IMMEDIATE")
            try:
                yield connection
            except BaseException:
                if connection.in_transaction:
                    connection.execute("ROLLBACK")
                raise
            connection.execute("COMMIT")
        finally:
            connection.close()

    @contextmanager
    def open_write_transaction_without_foreign_keys(self) -> Iterator[sqlite3.Connection]:
        connection = open_sqlite_connection(self.database_path)
        try:
            connection.execute("PRAGMA foreign_keys = OFF")
            connection.execute("BEGIN IMMEDIATE")
            try:
                yield connection
            except BaseException:
                if connection.in_transaction:
                    connection.execute("ROLLBACK")
                raise
            connection.execute("COMMIT")
        finally:
            connection.close()
