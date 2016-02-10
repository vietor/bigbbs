
CREATE TABLE counters
(
  id integer NOT NULL,
  value bigint,
  CONSTRAINT "PK_counters" PRIMARY KEY (id)
);

INSERT INTO counters(id, value) VALUES(1,0);
INSERT INTO counters(id, value) VALUES(2,0);
INSERT INTO counters(id, value) VALUES(3,0);



CREATE TABLE users
(
  id bigserial NOT NULL,
  username character varying(32) NOT NULL,
  password character varying(32),
  create_date bigint NOT NULL,
  email character varying(128) NOT NULL,
  homepage character varying(256),
  signature character varying(256),
  score bigint DEFAULT 0,
  role integer DEFAULT 0,
  ukey character(32) NOT NULL,
  avatar character varying(1024),
  topic_count bigint DEFAULT 0,
  reset_code character varying(512),
  reset_date bigint DEFAULT 0,
  active_date bigint DEFAULT 0,
  active_days integer DEFAULT 0,
  CONSTRAINT "PK_users" PRIMARY KEY (id),
  CONSTRAINT "UK_users_email" UNIQUE (email),
  CONSTRAINT "UK_users_ukey" UNIQUE (ukey)
);



CREATE TABLE topics
(
  id bigserial NOT NULL,
  title character varying(1024) NOT NULL,
  content text NOT NULL,
  user_id bigint NOT NULL,
  create_date bigint NOT NULL,
  reply_count bigint NOT NULL DEFAULT 0,
  node_id integer NOT NULL DEFAULT 0,
  update_date bigint NOT NULL,
  update_user_id bigint DEFAULT 0,
  status integer DEFAULT 0,
  CONSTRAINT "PK_topics" PRIMARY KEY (id)
);

CREATE INDEX "IX_topics_user_create" ON topics
USING btree (user_id, create_date DESC);



CREATE TABLE replies
(
  id bigserial NOT NULL,
  topic_id bigint NOT NULL,
  content text NOT NULL,
  user_id bigint NOT NULL,
  create_date bigint NOT NULL,
  CONSTRAINT "PK_replies" PRIMARY KEY (id)
);

CREATE INDEX "IX_replies_topic_create" ON replies
USING btree (topic_id, create_date ASC);
