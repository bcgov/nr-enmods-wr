CREATE TABLE file_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(100) NOT NULL,
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

COMMENT ON TABLE file_info IS 'Stores full file name as well as creation date, new files are created by upserting the most recent file.'