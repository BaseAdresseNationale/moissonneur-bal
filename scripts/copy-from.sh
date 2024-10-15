echo 'IMPORT ORGANIZATIONS'
psql -d moissonneur-bal -U api-bal-user -c "\\COPY organizations (id,name,page,logo,created_at,updated_at,deleted_at) FROM '../export-csv/csv/moissonneur-bal/organizations.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT PERIMETERS'
psql -d moissonneur-bal -U api-bal-user -c "\\COPY perimeters (id,organization_id, type,code) FROM '../export-csv/csv/moissonneur-bal/perimeters.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT SOURCES'
psql -d moissonneur-bal -U api-bal-user -c "\\COPY sources (id,organization_id,title,url,description,license,enabled,last_harvest,harvesting_since,created_at,updated_at,deleted_at) FROM '../export-csv/csv/moissonneur-bal/sources.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT HARVEST'
psql -d moissonneur-bal -U api-bal-user -c "\\COPY harvests (id,source_id,file_id,file_hash,data_hash,status,update_status,update_rejection_reason,error,started_at,finished_at) FROM '../export-csv/csv/moissonneur-bal/harvests.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT REVISIONS'
psql -d moissonneur-bal -U api-bal-user -c "\\COPY revisions (id,source_id,harvest_id,file_id,data_hash,code_commune,update_status,update_rejection_reason,publication,validation,created_at) FROM '../export-csv/csv/moissonneur-bal/revisions.csv' DELIMITER ',' CSV HEADER"

