
CREATE TABLE counters
(
  _id varchar(64) NOT NULL,
  value bigint,
  PRIMARY KEY (_id)
);

INSERT INTO counters(_id, value) VALUES('users', 0);
INSERT INTO counters(_id, value) VALUES('topics', 0);
INSERT INTO counters(_id, value) VALUES('replies', 0);


CREATE TABLE users
(
  _id bigint NOT NULL AUTO_INCREMENT,
  username varchar(32) NOT NULL,
  password varchar(32),
  create_date bigint NOT NULL,
  email varchar(128) NOT NULL,
  homepage varchar(256),
  signature varchar(256),
  score bigint DEFAULT 0,
  role integer DEFAULT 0,
  ukey char(32) NOT NULL,
  avatar varchar(1024),
  topic_count bigint DEFAULT 0,
  reset_code varchar(512),
  reset_date bigint DEFAULT 0,
  active_date bigint DEFAULT 0,
  active_days integer DEFAULT 0,
  status integer DEFAULT 0,
  status_expire bigint DEFAULT 0,
  PRIMARY KEY (_id)
);

CREATE UNIQUE INDEX UK_users_email ON users (email) USING BTREE;
CREATE UNIQUE INDEX UK_users_ukey ON users (ukey) USING BTREE;


CREATE TABLE topics
(
  _id bigint NOT NULL AUTO_INCREMENT,
  title varchar(1024) NOT NULL,
  content text NOT NULL,
  user_id bigint NOT NULL,
  create_date bigint NOT NULL,
  reply_count bigint NOT NULL DEFAULT 0,
  node_id integer NOT NULL DEFAULT 0,
  update_date bigint NOT NULL,
  update_user_id bigint DEFAULT 0,
  status integer DEFAULT 0,
  PRIMARY KEY (_id)
);

CREATE INDEX IX_topics_user_create ON topics (user_id, create_date DESC) USING BTREE;
CREATE INDEX IX_topics_node_create ON topics (node_id, create_date DESC) USING BTREE;
CREATE INDEX IX_topics_node_update ON topics (node_id, update_date DESC) USING BTREE;



CREATE TABLE replies
(
  _id bigint NOT NULL AUTO_INCREMENT,
  topic_id bigint NOT NULL,
  content text NOT NULL,
  user_id bigint NOT NULL,
  create_date bigint NOT NULL,
  PRIMARY KEY (_id)
);

CREATE INDEX IX_replies_topic_create ON replies (topic_id, create_date ASC) USING BTREE;
