import subprocess
from pathlib import Path


def ensure_structure(base: Path):
    data = base / 'data'
    models = base / 'models'
    data.mkdir(exist_ok=True)
    models.mkdir(exist_ok=True)
    return data, models


def write_files(data: Path, base: Path):
    (data / 'nlu.yml').write_text(
        (
            'version: "3.1"\n'
            'nlu:\n'
            '- intent: greet\n'
            '  examples: |\n'
            '    - hello\n    - hi\n    - hey\n    - good morning\n    - good evening\n'
            '- intent: fee_query\n'
            '  examples: |\n'
            '    - show my fee details\n    - what is my fee status\n    - how much fees pending\n    - fee details\n'
            '- intent: attendance_query\n'
            '  examples: |\n'
            '    - what is my attendance\n    - show my attendance\n    - attendance percentage\n    - attendance details\n'
            '- intent: event_query\n'
            '  examples: |\n'
            '    - list upcoming events\n    - show events\n    - any events this week\n    - upcoming college events\n'
        )
    )

    (data / 'stories.yml').write_text(
        (
            'version: "3.1"\n'
            'stories:\n'
            '- story: greet path\n'
            '  steps:\n'
            '  - intent: greet\n'
            '  - action: utter_greet\n'
            '- story: fee path\n'
            '  steps:\n'
            '  - intent: fee_query\n'
            '  - action: utter_fee\n'
            '- story: attendance path\n'
            '  steps:\n'
            '  - intent: attendance_query\n'
            '  - action: utter_attendance\n'
            '- story: event path\n'
            '  steps:\n'
            '  - intent: event_query\n'
            '  - action: utter_event\n'
        )
    )

    (data / 'rules.yml').write_text(
        (
            'version: "3.1"\n'
            'rules:\n'
            '- rule: greet rule\n'
            '  steps:\n'
            '  - intent: greet\n'
            '  - action: utter_greet\n'
            '- rule: fee rule\n'
            '  steps:\n'
            '  - intent: fee_query\n'
            '  - action: utter_fee\n'
            '- rule: attendance rule\n'
            '  steps:\n'
            '  - intent: attendance_query\n'
            '  - action: utter_attendance\n'
            '- rule: event rule\n'
            '  steps:\n'
            '  - intent: event_query\n'
            '  - action: utter_event\n'
        )
    )

    (data.parent / 'domain.yml').write_text(
        (
            'version: "3.1"\n'
            'intents:\n'
            '  - greet\n  - fee_query\n  - attendance_query\n  - event_query\n'
            '\nresponses:\n'
            '  utter_greet:\n  - text: "Hello! How can I help you today?"\n'
            '  utter_fee:\n  - text: "Here are your fee details:"\n'
            '  utter_attendance:\n  - text: "Here is your attendance information:"\n'
            '  utter_event:\n  - text: "Here are the upcoming events:"\n'
        )
    )

    (base / 'config.yml').write_text(
        (
            'language: en\n'
            'pipeline:\n'
            '  - name: WhitespaceTokenizer\n'
            '  - name: RegexFeaturizer\n'
            '  - name: LexicalSyntacticFeaturizer\n'
            '  - name: CountVectorsFeaturizer\n'
            '  - name: DIETClassifier\n'
            '    epochs: 50\n'
            '  - name: EntitySynonymMapper\n'
            'policies:\n'
            '  - name: RulePolicy\n'
        )
    )


def train(base: Path):
    cmd = [
        'rasa', 'train',
        '--domain', str(base / 'domain.yml'),
        '--data', str(base / 'data'),
        '--config', str(base / 'config.yml'),
        '--out', str(base / 'models')
    ]
    print('Running:', ' '.join(cmd))
    subprocess.check_call(cmd, cwd=base)


if __name__ == '__main__':
    base = Path(__file__).resolve().parent
    data, _ = ensure_structure(base)
    write_files(data, base)
    train(base)


