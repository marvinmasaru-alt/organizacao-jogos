# Feito
eu quero criar um endpoint que cadastre um funcionario, ele deve inserir no banco os dados da tabela funcionario e apenas aceitar requisições que tenham uma chave de api configuravel pelo environment.

Toda vez que alguem responder um form com o google scripts eu vou chamar esse endpoint e salvar os seguintes dados:
- Carimbo de data/hora => created_at e updated_at
- Nome completo/氏名 => nome
- Telefone/電話番号 => telefone
- Zairyū Card (frente)/在留カード（表面）e => documento_url (Deve salvar junto com o campo do verso, separado por virgula)
- Zairyū Card (verso)/在留カード（裏面）=> (Deve salvar junto com o campo da frente, separado por virgula)
- Província/都道府県 => provincia
- Código postal/郵便番号 => codigo_postal
- Responsável / 担当者	=> responsavel_id 

Ele deve salvar os dados:
- Sempre em estado pendente
- Data de cadastro é sempre a atual

Eu quero que crie tb uma chave de api para eu poder cadastrar no google scripts para que ninguem chame esse endpoint a vontade

# A ser feito:
eu quero criar uma nova tela de: Funcionarios

Nessa tela eu quero que tenha a lista de todos os funcionários que são meus, e quero poder tambem editar os dados deles caso eu precise.

Na tela de funcionarios deve ter uma lista que tenha todos os meus funcionarios e um botão para editar e visualizar.

Eu quero que apareça todos os dados que tem no cadastro do funcionario

Eu quero poder alterar, nome, telefone, documento_url, provincia, codigo_postal e status (Podendo alterar ele entre pendente aprovado e inativo)

Eu quero poder acessar a tela de funcionarios pelo dashboard

Se eu for admin eu quero que tenha um dropdown no canto superior que eu possa ver os funcionarios de outros responsaveis

# Efeitos colaterais.
Como agora vamos adicionar um status novo de inativo, eu não quero que ele apareça para ser alocado na tela de alocamento caso ele não seja status aprovado

Eu quero que apareça também no dashboard os funcionarios que estão no status pendente para o responsável saber que tem mais funcionarios para aprovação