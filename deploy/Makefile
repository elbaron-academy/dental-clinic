.PHONY: help deploy update install config

help:
	@echo "make config   - overwrite config.yml with config.yml.example"
	@echo "make install  - install Python dependencies"
	@echo "make deploy   - provision the server if needed, then deploy backend + web"
	@echo "make update   - routine update: pull, deploy backend + web (no provisioning)"

config:
	cp config.yml.example config.yml

install:
	pip install -r requirements.txt

deploy:
	python3 deploy.py production

update:
	python3 deploy.py production --update
