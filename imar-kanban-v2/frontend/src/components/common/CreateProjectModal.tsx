import { Form, Input, Modal, message } from 'antd';
import { useProjectStore } from '../../stores/projectStore';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const createProject = useProjectStore((s) => s.createProject);
  const navigate = useNavigate();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const project = await createProject(values);
      message.success('Proje oluşturuldu!');
      form.resetFields();
      onClose();
      navigate(`/proje/${project.id}/pano/default`);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // validation error
      const error = err as Error;
      message.error(error.message || 'Proje oluşturulamadı');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    // Otomatik key oluştur: büyük harf, türkçe karakter dönüşümü
    const key = name
      .toUpperCase()
      .replace(/İ/g, 'I')
      .replace(/Ö/g, 'O')
      .replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S')
      .replace(/Ç/g, 'C')
      .replace(/Ğ/g, 'G')
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    form.setFieldValue('key', key);
  };

  return (
    <Modal
      title="Yeni Proje Oluştur"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleOk}
      okText="Oluştur"
      cancelText="İptal"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="Proje Adı"
          rules={[{ required: true, message: 'Proje adı zorunludur' }]}
        >
          <Input placeholder="ör: İmar Kanban" onChange={handleNameChange} />
        </Form.Item>

        <Form.Item
          name="key"
          label="Proje Anahtarı"
          rules={[
            { required: true, message: 'Proje anahtarı zorunludur' },
            { pattern: /^[A-Z][A-Z0-9]{1,9}$/, message: 'Büyük harf ve rakamlardan oluşmalı (2-10 karakter)' },
          ]}
          extra="Görev numaralarında kullanılacak (ör: IMAR-1, IMAR-2)"
          normalize={(value: string) =>
            (value || '')
              .toUpperCase()
              .replace(/İ/g, 'I')
              .replace(/Ö/g, 'O')
              .replace(/Ü/g, 'U')
              .replace(/Ş/g, 'S')
              .replace(/Ç/g, 'C')
              .replace(/Ğ/g, 'G')
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, 10)
          }
        >
          <Input placeholder="ör: IMAR" maxLength={10} />
        </Form.Item>

        <Form.Item name="description" label="Açıklama">
          <Input.TextArea rows={3} placeholder="Proje açıklaması (opsiyonel)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
