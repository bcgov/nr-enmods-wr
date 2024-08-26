CREATE SCHEMA IF NOT EXISTS enmodwr;

CREATE SEQUENCE IF NOT EXISTS enmodwr."USER_SEQ"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 100;

CREATE TABLE IF NOT EXISTS enmodwr.USERS
(
    ID    numeric      not null
        constraint "USER_PK"
            primary key DEFAULT nextval('enmodwr."USER_SEQ"'),
    NAME  varchar(200) not null,
    EMAIL varchar(200) not null
);
INSERT INTO enmodwr.USERS (NAME, EMAIL)
VALUES ('John', 'John.ipsum@test.com'),
       ('Jane', 'Jane.ipsum@test.com'),
       ('Jack', 'Jack.ipsum@test.com'),
       ('Jill', 'Jill.ipsum@test.com'),
       ('Joe', 'Joe.ipsum@test.com');

